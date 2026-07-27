"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  User, CreditCard, Briefcase, Heart, BedDouble, IndianRupee, UtensilsCrossed,
  ChevronLeft, ChevronRight, Check, X, Loader2, Search, Sparkles,
  AlertCircle, FileCheck, Plus, Minus, Users, User as MaleIcon, User as FemaleIcon, Heart as HeartIcon,
  Home, Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Property {
  id: string;
  name: string;
}

interface RoomCombination {
  maleRooms: RoomAssignment[];
  femaleRooms: RoomAssignment[];
  coupleRooms: RoomAssignment[];
  totalRooms: number;
  totalBeds: number;
  avgRent: number;
  score: number;
  partialAllocation?: {
    type: 'male-only' | 'female-only';
    message: string;
    malesAllocated: boolean;
    femalesAllocated: boolean;
  };
}

interface RoomAssignment {
  roomId: string;
  roomNumber: string;
  floorNumber: number;
  floorName: string;
  roomType: string;
  totalBeds: number;
  vacantBeds: number;
  rentPerBed: number;
  depositAmount: number;
  currentGenders: string[];
  occupants: { name: string; gender: string }[];
  vacantBedIds: { bedId: string; bedNumber: string }[];
  assignedBeds: number;
}

interface GroupComposition {
  males: number;
  females: number;
  couples: number;
}

interface ResidentFormData {
  fullName: string;
  phone: string;
  email: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  bloodGroup: string;
  aadhaarNumber: string;
  panNumber: string;
  passportNumber: string;
  occupation: string;
  companyName: string;
  collegeName: string;
  workAddress: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  bedId: string;
  roomId: string;
  rentAmount: number;
  depositPaid: number;
  foodPreference: string;
  mealPlan: string;
  specialDietary: string;
}

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Group", icon: Users, desc: "Group composition" },
  { label: "Rooms", icon: BedDouble, desc: "Room selection" },
  { label: "Personal", icon: User, desc: "Basic information" },
  { label: "Identity", icon: CreditCard, desc: "Documents" },
  { label: "Employment", icon: Briefcase, desc: "Work details" },
  { label: "Emergency", icon: Heart, desc: "Emergency contact" },
  { label: "Financial", icon: IndianRupee, desc: "Rent & deposit" },
  { label: "Food", icon: UtensilsCrossed, desc: "Meal preferences" },
  { label: "Review", icon: FileCheck, desc: "Confirm details" },
  { label: "Confirm", icon: Check, desc: "Review all residents before check-in" },
];

const RESIDENT_STEPS_START = 2;
const RESIDENT_STEPS_END = 8;

function emptyResidentForm(gender: "male" | "female" = "male"): ResidentFormData {
  return {
    fullName: "",
    phone: "",
    email: "",
    gender,
    dateOfBirth: "",
    bloodGroup: "",
    aadhaarNumber: "",
    panNumber: "",
    passportNumber: "",
    occupation: "",
    companyName: "",
    collegeName: "",
    workAddress: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    bedId: "",
    roomId: "",
    rentAmount: 0,
    depositPaid: 0,
    foodPreference: "vegetarian",
    mealPlan: "both",
    specialDietary: "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CheckInPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const residentsInitializedRef = useRef(false);

  // Properties
  const [properties, setProperties] = useState<Property[]>([]);

  // Group composition
  const [groupComposition, setGroupComposition] = useState<GroupComposition>({ males: 0, females: 0, couples: 0 });

  // Room suggestions
  const [suggesting, setSuggesting] = useState(false);
  const [combinations, setCombinations] = useState<RoomCombination[]>([]);
  const [selectedCombinationIndex, setSelectedCombinationIndex] = useState(0);

  // Bed assignments
  const [bedAssignments, setBedAssignments] = useState<{
    males: { bedId: string; roomId: string; roomNumber: string; bedNumber: string; rentAmount: number }[];
    females: { bedId: string; roomId: string; roomNumber: string; bedNumber: string; rentAmount: number }[];
    couples: { bedId: string; roomId: string; roomNumber: string; bedNumber: string; rentAmount: number }[];
  }>({ males: [], females: [], couples: [] });

  // Resident forms
  const [residents, setResidents] = useState<ResidentFormData[]>([]);
  const [currentResidentIndex, setCurrentResidentIndex] = useState(0);

  // Move-in date
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split("T")[0]);

  // ── Load properties ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<{ data: Property[] }>("/properties").then((res) => {
      setProperties(res?.data || []);
    }).catch(() => {});
  }, []);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const totalPeople = groupComposition.males + groupComposition.females + groupComposition.couples * 2;
  const totalAssignedBeds = bedAssignments.males.length + bedAssignments.females.length + bedAssignments.couples.length;
  const isGroupComplete = totalPeople > 0 && totalAssignedBeds === totalPeople;
  const currentResident = residents[currentResidentIndex];
  const isResidentStep = step >= RESIDENT_STEPS_START && step <= RESIDENT_STEPS_END;

  // ── Initialize residents from bed assignments ────────────────────────────────
  useEffect(() => {
    if (isGroupComplete && residents.length === 0) {
      const newResidents: ResidentFormData[] = [];

      bedAssignments.males.forEach((b, i) => {
        newResidents.push({ ...emptyResidentForm("male"), bedId: b.bedId, roomId: b.roomId, rentAmount: b.rentAmount });
      });
      bedAssignments.females.forEach((b, i) => {
        newResidents.push({ ...emptyResidentForm("female"), bedId: b.bedId, roomId: b.roomId, rentAmount: b.rentAmount });
      });
      bedAssignments.couples.forEach((b, i) => {
        // Couples get two residents - one male, one female sharing the same room/beds
        // For simplicity, we'll create two entries with same room, different beds
        const coupleBeds = combinations[selectedCombinationIndex]?.coupleRooms.find(r => r.roomId === b.roomId)?.vacantBedIds || [];
        if (coupleBeds.length >= 2) {
          newResidents.push({ ...emptyResidentForm("male"), bedId: coupleBeds[0].bedId, roomId: b.roomId, rentAmount: b.rentAmount });
          newResidents.push({ ...emptyResidentForm("female"), bedId: coupleBeds[1].bedId, roomId: b.roomId, rentAmount: b.rentAmount });
        } else {
          newResidents.push({ ...emptyResidentForm("male"), bedId: b.bedId, roomId: b.roomId, rentAmount: b.rentAmount });
        }
      });

      // Use a ref to track if we've initialized to avoid re-initialization
      if (!residentsInitializedRef.current) {
        residentsInitializedRef.current = true;
        setResidents(newResidents);
        setCurrentResidentIndex(0);
      }
    }
  }, [isGroupComplete, bedAssignments, combinations, selectedCombinationIndex, residents.length]);

  // ── Update helpers ───────────────────────────────────────────────────────────
  const update = (field: string, value: string | number) => {
    if (isResidentStep && currentResident) {
      setResidents(prev => {
        const next = [...prev];
        next[currentResidentIndex] = { ...next[currentResidentIndex], [field]: value };
        return next;
      });
    } else {
      // For group-level fields
      if (field === "moveInDate") setMoveInDate(value as string);
    }
    if (fieldErrors[field]) setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const updateGroup = (field: keyof GroupComposition, value: number) => {
    setGroupComposition(prev => ({ ...prev, [field]: Math.max(0, value) }));
    autoFetchedRef.current = false;
  };

  // ── Room suggestion ──────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async () => {
    setSuggesting(true);
    setError(null);

    const { males, females, couples } = groupComposition;
    if (males + females + couples === 0) {
      setError("Add at least one resident");
      setSuggesting(false);
      return;
    }
    if (!properties.length) {
      setError("No properties available. Check API connection.");
      setSuggesting(false);
      return;
    }

    try {
      const result = await api.suggestGroup<{
        combinations: RoomCombination[];
        bestFitIndex: number;
        message?: string;
      }>({
        males,
        females,
        couples,
        propertyId: properties[0].id,
      });
      if (result.message) {
        setError(result.message);
      }
      const combos = (result.combinations || []).slice(0, 5);
      if (combos.length === 0) {
        setCombinations([]);
        if (!result.message) setError("No room combinations found");
      } else {
        setCombinations(combos);
        setSelectedCombinationIndex(Math.max(0, result.bestFitIndex));
        setStep(1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get room suggestions";
      setError(message);
      setCombinations([]);
    } finally {
      setSuggesting(false);
    }
  }, [groupComposition, properties]);

  // ── Auto-fetch suggestions when entering Step 1 ──────────────────────────────
  const autoFetchedRef = useRef(false);
  useEffect(() => {
    if (step === 1 && combinations.length === 0 && totalPeople > 0 && !autoFetchedRef.current) {
      autoFetchedRef.current = true;
      fetchSuggestions();
    }
  }, [step, combinations.length, totalPeople, fetchSuggestions]);

  // ── Select combination ───────────────────────────────────────────────────────
  const selectCombination = (index: number) => {
    setSelectedCombinationIndex(index);
    setBedAssignments({ males: [], females: [], couples: [] });
    setResidents([]);
    residentsInitializedRef.current = false;
    autoFetchedRef.current = false;
  };

  // ── Bed selection ────────────────────────────────────────────────────────────
  const assignBed = (group: "males" | "females" | "couples", room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => {
    const combo = combinations[selectedCombinationIndex];
    if (!combo) return;

    const rooms = group === "males" ? combo.maleRooms : group === "females" ? combo.femaleRooms : combo.coupleRooms;
    const roomData = rooms.find(r => r.roomId === room.roomId);
    if (!roomData) return;

    const alreadyAssigned = bedAssignments[group].some(b => b.bedId === bed.bedId);
    if (alreadyAssigned) return;

    const currentCount = bedAssignments[group].length;
    const needed = group === "couples" ? groupComposition.couples * 2 : groupComposition[group === "males" ? "males" : "females"];
    if (currentCount >= needed) return;

    setBedAssignments(prev => ({
      ...prev,
      [group]: [...prev[group], {
        bedId: bed.bedId,
        roomId: room.roomId,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        rentAmount: room.rentPerBed,
      }]
    }));
  };

  const unassignBed = (group: "males" | "females" | "couples", bedId: string) => {
    setBedAssignments(prev => ({
      ...prev,
      [group]: prev[group].filter(b => b.bedId !== bedId)
    }));
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const validateStep = useCallback(() => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (totalPeople === 0) errors.group = "Add at least one resident";
    }

    if (step === 1) {
      if (!isGroupComplete) errors.beds = "Assign all beds before continuing";
    }

    if (isResidentStep && currentResident) {
      const residentStep = step - RESIDENT_STEPS_START;
      if (residentStep === 0) { // Personal
        if (!currentResident.fullName.trim()) errors.fullName = "Full name is required";
        if (!currentResident.phone.trim()) errors.phone = "Phone number is required";
        else if (currentResident.phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a valid phone number";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [step, groupComposition, isGroupComplete, currentResident]);

  const next = () => {
    if (!validateStep()) return;

    if (step === 1 && isGroupComplete) {
      // Move from Room Selection to first resident's Personal step
      setStep(RESIDENT_STEPS_START);
      return;
    }

    if (isResidentStep) {
      const currentResidentStep = step - RESIDENT_STEPS_START;
      const isLastResidentStep = currentResidentStep === RESIDENT_STEPS_END - RESIDENT_STEPS_START;
      const isLastResident = currentResidentIndex === residents.length - 1;

      if (!isLastResidentStep) {
        // Advance to next sub-step within current resident (e.g., Personal -> Identity)
        setStep(step + 1);
      } else if (!isLastResident) {
        // Finished all sub-steps for this resident, move to next resident's Personal step
        setCurrentResidentIndex(prev => prev + 1);
        setStep(RESIDENT_STEPS_START);
      } else {
        // Last resident, last sub-step -> move to final Review step
        if (step < STEPS.length - 1) setStep(step + 1);
      }
      return;
    }

    // Default: advance step
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prev = () => {
    if (isResidentStep) {
      const currentResidentStep = step - RESIDENT_STEPS_START;
      
      if (currentResidentStep > 0) {
        // Go back to previous sub-step within current resident
        setStep(step - 1);
      } else if (currentResidentIndex > 0) {
        // At Personal step, go back to previous resident's Review step
        setCurrentResidentIndex(prev => prev - 1);
        setStep(RESIDENT_STEPS_END);
      } else {
        // First resident, first step -> go back to Room Selection
        residentsInitializedRef.current = false;
        autoFetchedRef.current = false;
        setStep(step - 1);
      }
      return;
    }
    
    if (step > 0) setStep(step - 1);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.checkinGroup({
        propertyId: properties[0]?.id || "",
        moveInDate,
        residents: residents.map(r => ({
          fullName: r.fullName,
          phone: r.phone,
          email: r.email || undefined,
          gender: r.gender,
          dateOfBirth: r.dateOfBirth || undefined,
          bloodGroup: r.bloodGroup || undefined,
          aadhaarNumber: r.aadhaarNumber || undefined,
          panNumber: r.panNumber || undefined,
          passportNumber: r.passportNumber || undefined,
          occupation: r.occupation || undefined,
          companyName: r.companyName || undefined,
          collegeName: r.collegeName || undefined,
          workAddress: r.workAddress || undefined,
          emergencyName: r.emergencyName || undefined,
          emergencyPhone: r.emergencyPhone || undefined,
          emergencyRelation: r.emergencyRelation || undefined,
          bedId: r.bedId,
          rentAmount: r.rentAmount,
          depositPaid: r.depositPaid,
          foodPreference: r.foodPreference,
          mealPlan: r.mealPlan,
          specialDietary: r.specialDietary || undefined,
        })),
      });
      router.push("/residents");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to check in residents";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        if (step < STEPS.length - 1) next();
        else handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, residents]);

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors[field]}</p>;
  };

  const inputClass = (field: string) => cn(
    "w-full h-10 px-3 mt-1.5 rounded-lg border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 transition-colors",
    fieldErrors[field] ? "border-danger focus:ring-danger/20 focus:border-danger" : "border-border focus:ring-accent/20 focus:border-accent"
  );

  // ── Step Content ─────────────────────────────────────────────────────────────
  const renderStepContent = () => {
    // Step 0: Group Composition
    if (step === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wide">Group Composition</h3>
          <p className="text-sm text-ink-muted">How many residents are checking in together?</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GroupCounter
              label="Male Residents"
              count={groupComposition.males}
              onChange={v => updateGroup("males", v)}
              icon={MaleIcon}
              color="text-blue-500"
              bgColor="bg-blue-50 border-blue-200"
            />
            <GroupCounter
              label="Female Residents"
              count={groupComposition.females}
              onChange={v => updateGroup("females", v)}
              icon={FemaleIcon}
              color="text-pink-500"
              bgColor="bg-pink-50 border-pink-200"
            />
            <GroupCounter
              label="Couples"
              count={groupComposition.couples}
              onChange={v => updateGroup("couples", v)}
              icon={HeartIcon}
              color="text-purple-500"
              bgColor="bg-purple-50 border-purple-200"
            />
          </div>

          <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Total People</span>
              <span className="font-bold text-ink">{totalPeople}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-ink-muted">Estimated Rooms</span>
              <span className="font-bold text-ink">{groupComposition.couples + Math.ceil(groupComposition.males / 2) + Math.ceil(groupComposition.females / 2)}</span>
            </div>
          </div>

          {totalPeople > 0 && (
            <button
              onClick={fetchSuggestions}
              disabled={suggesting}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {suggesting ? "Finding Rooms..." : "Find Rooms"}
            </button>
)}
        </div>
      );
    }

    // Step 1: Room Selection
    if (step === 1) {
      const combo = combinations[selectedCombinationIndex];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wide">Room Selection</h3>
            {combinations.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <button
                  onClick={() => selectCombination(selectedCombinationIndex - 1)}
                  disabled={selectedCombinationIndex === 0}
                  className="p-1 rounded hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="flex items-center gap-1 min-w-[100px] justify-center">
                  <Building2 className="w-3 h-3" />
                  {selectedCombinationIndex + 1} of {combinations.length}
                </span>
                <button
                  onClick={() => selectCombination(selectedCombinationIndex + 1)}
                  disabled={selectedCombinationIndex === combinations.length - 1}
                  className="p-1 rounded hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>


          {fieldErrors.beds && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-light border border-danger/20 text-sm text-danger">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{fieldErrors.beds}</span>
            </div>
          )}

          {combinations.length === 0 ? (
            <div className="text-center py-8 text-ink-muted">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Click Find Rooms to see available combinations</p>
              <button
                onClick={fetchSuggestions}
                disabled={suggesting}
                className="mt-4 flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-50"
              >
                {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {suggesting ? "Finding..." : "Find Rooms"}
              </button>
            </div>
          ) : (
            <>
              {/* Partial allocation warning badges */}
              {(() => {
                const pa = combo?.partialAllocation;
                if (!pa) return null;
                return (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          {pa!.type === 'male-only' ? '⚠ Male Only Allocation' : '⚠ Female Only Allocation'}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">{pa!.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

{(() => {
                const allAssignedBeds = [
                  ...bedAssignments.males,
                  ...bedAssignments.females,
                  ...bedAssignments.couples,
                ];

                return (
                  <div className="space-y-4">
                    {combo?.maleRooms.length > 0 && (
                      <RoomGroupCard
                        title="Male Residents"
                        icon={MaleIcon}
                        color="text-blue-500 bg-blue-50 border-blue-200"
                        rooms={combo.maleRooms}
                        assigned={bedAssignments.males}
                        onAssign={assignBed}
                        onUnassign={unassignBed}
                        needed={groupComposition.males}
                        group="males"
                        allAssigned={allAssignedBeds}
                      />
                    )}
                    {combo?.femaleRooms.length > 0 && (
                      <RoomGroupCard
                        title="Female Residents"
                        icon={FemaleIcon}
                        color="text-pink-500 bg-pink-50 border-pink-200"
                        rooms={combo.femaleRooms}
                        assigned={bedAssignments.females}
                        onAssign={assignBed}
                        onUnassign={unassignBed}
                        needed={groupComposition.females}
                        group="females"
                        allAssigned={allAssignedBeds}
                      />
                    )}
                    {combo?.coupleRooms.length > 0 && (
                      <RoomGroupCard
                        title="Couples (Private Rooms)"
                        icon={HeartIcon}
                        color="text-purple-500 bg-purple-50 border-purple-200"
                        rooms={combo.coupleRooms}
                        assigned={bedAssignments.couples}
                        onAssign={assignBed}
                        onUnassign={unassignBed}
                        needed={groupComposition.couples * 2}
                        group="couples"
                        isCouple
                        allAssigned={allAssignedBeds}
                      />
)}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      );
    }
    if (isResidentStep && currentResident) {
      const residentStep = step - RESIDENT_STEPS_START;
      const progress = residents.length > 0 ? ((currentResidentIndex) / residents.length) * 100 : 0;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                {STEPS[step].label} <span className="text-ink-muted font-normal">({currentResidentIndex + 1} of {residents.length})</span>
              </h3>
              <p className="text-xs text-ink-muted">{STEPS[step].desc}</p>
            </div>
            <div className="w-32 h-1.5 bg-canvas rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {residentStep === 0 && <ResidentPersonalStep resident={currentResident} update={update} inputClass={inputClass} FieldError={FieldError} />}
          {residentStep === 1 && <ResidentIdentityStep resident={currentResident} update={update} inputClass={inputClass} />}
          {residentStep === 2 && <ResidentEmploymentStep resident={currentResident} update={update} inputClass={inputClass} />}
          {residentStep === 3 && <ResidentEmergencyStep resident={currentResident} update={update} inputClass={inputClass} />}
          {residentStep === 4 && <ResidentFinancialStep resident={currentResident} update={update} inputClass={inputClass} moveInDate={moveInDate} />}
          {residentStep === 5 && <ResidentFoodStep resident={currentResident} update={update} inputClass={inputClass} />}
          {residentStep === 6 && <ResidentReviewStep resident={currentResident} index={currentResidentIndex} total={residents.length} />}
</div>
  );
}

    // Final Review Step (step 9)
    return <FinalReviewStep residents={residents} moveInDate={moveInDate} />;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <PageHeader
        title="Group Check-in"
        description="Check in multiple residents at once"
        icon={Users}
        action={
          <button onClick={() => router.back()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-ink-secondary hover:bg-canvas hover:text-ink transition-colors">
            <X className="w-4 h-4" /> Cancel
          </button>
        }
      />

      {/* Step Indicator */}
      <div className="bg-surface rounded-xl border border-border p-4 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-[720px]">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isComplete = i < step;
            const isCurrent = i === step;
            return (
              <div key={s.label} className="flex items-center flex-1">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn("flex flex-col items-center gap-1 transition-all mx-auto", i <= step ? "cursor-pointer" : "cursor-not-allowed opacity-40")}
                  title={s.desc}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    isComplete ? "bg-accent text-white" : isCurrent ? "bg-accent/10 text-accent ring-2 ring-accent/20" : "bg-canvas text-ink-muted"
                  )}>
                    {isComplete ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn("text-[9px] font-medium hidden lg:block whitespace-nowrap", isCurrent ? "text-accent" : "text-ink-muted")}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={cn("h-0.5 mx-0.5 flex-1", i < step ? "bg-accent" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && <div className="p-3 rounded-lg bg-danger-light border border-danger/20 text-sm text-danger">{error}</div>}

      {/* Step Content */}
      <div className="bg-surface rounded-xl border border-border p-6 min-h-[320px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prev} disabled={step === 0} className={cn("flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors", step === 0 ? "text-ink-muted opacity-40 cursor-not-allowed" : "text-ink-secondary hover:bg-canvas hover:text-ink")}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs text-ink-muted">Step {step + 1} of {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dark active:scale-[0.98] transition-all">
            {isResidentStep && currentResidentIndex === residents.length - 1 && step === RESIDENT_STEPS_END ? "Finish" : "Next"} <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className={cn("flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all", submitting ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]")}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking in... </> : <><Check className="w-4 h-4" /> Complete Check-in</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GroupCounter({ label, count, onChange, icon: Icon, color, bgColor }: {
  label: string;
  count: number;
  onChange: (v: number) => void;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`p-4 rounded-xl border ${bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color.replace("text-", "bg-").replace("500", "100")}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{label}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => onChange(count - 1)} disabled={count <= 0} className="w-10 h-10 rounded-lg border border-border bg-surface text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center">
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-2xl font-bold text-ink w-16 text-center">{count}</span>
        <button onClick={() => onChange(count + 1)} className="w-10 h-10 rounded-lg border border-border bg-surface text-ink hover:bg-canvas flex items-center justify-center">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function RoomGroupCard({ title, icon: Icon, color, rooms, assigned, onAssign, onUnassign, needed, group, isCouple, allAssigned }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  rooms: RoomAssignment[];
  assigned: { bedId: string; roomId: string; roomNumber: string; bedNumber: string; rentAmount: number }[];
  onAssign: (group: "males" | "females" | "couples", room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => void;
  onUnassign: (group: "males" | "females" | "couples", bedId: string) => void;
  needed: number;
  group: "males" | "females" | "couples";
  isCouple?: boolean;
  allAssigned: { bedId: string; roomId: string; roomNumber: string; bedNumber: string; rentAmount: number }[];
}) {
  const bgColor = color.includes("blue") ? "bg-blue-50 border-blue-200" : color.includes("pink") ? "bg-pink-50 border-pink-200" : "bg-purple-50 border-purple-200";
  const textColor = color.includes("blue") ? "text-blue-700" : color.includes("pink") ? "text-pink-700" : "text-purple-700";

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${textColor}`} />
          <span className="text-sm font-semibold text-ink">{title}</span>
        </div>
        <Badge variant="outline" className="text-xs">{assigned.length} / {needed}</Badge>
      </div>

      <div className="space-y-2">
        {rooms.map(room => (
          <div key={room.roomId} className="border border-border rounded-lg p-3 bg-surface">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-ink">Room {room.roomNumber}</span>
                {room.floorName && <span className="text-xs text-ink-muted ml-2">({room.floorName})</span>}
              </div>
              <span className="text-sm font-medium text-accent">{formatCurrency(room.rentPerBed)}/bed</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {room.vacantBedIds.map(bed => {
                const isAssignedHere = assigned.some(a => a.bedId === bed.bedId);
                const isAssignedAnywhere = allAssigned.some(a => a.bedId === bed.bedId);
                const roomHasOtherGender = room.vacantBedIds.some(b => 
                  allAssigned.some(a => a.bedId === b.bedId) && !assigned.some(a2 => a2.bedId === b.bedId)
                );
                const disabled = isAssignedAnywhere || roomHasOtherGender;
                return (
                  <button
                    key={bed.bedId}
                    onClick={() => isAssignedHere ? onUnassign(group, bed.bedId) : onAssign(group, room, bed)}
                    disabled={disabled || (isAssignedHere && !assigned.some(a => a.bedId === bed.bedId))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-w-[80px]",
                      isAssignedHere
                        ? "bg-accent text-white"
                        : disabled
                          ? "bg-canvas border border-border opacity-40 cursor-not-allowed"
                          : "bg-canvas border border-border hover:border-accent hover:bg-accent/5"
                    )}
                  >
                    Bed {bed.bedNumber} 
                    {isAssignedHere && <Check className="w-3 h-3 inline ml-1" />}
                    {disabled && !isAssignedHere && <span className="ml-1 opacity-50">🔒</span>}
                  </button>
                );
              })}
            </div>

            {room.currentGenders.length > 0 && (
              <p className="text-xs text-ink-muted mt-1">Occupied by: {room.occupants.map(o => `${o.name} (${o.gender})`).join(", ")}</p>
            )}
          </div>
        ))}

        {rooms.length === 0 && (
          <p className="text-sm text-ink-muted text-center py-4">No suitable rooms available</p>
        )}
      </div>
    </div>
  );
}

function ResidentPersonalStep({ resident, update, inputClass, FieldError }: {
  resident: ResidentFormData;
  update: (field: string, value: string | number) => void;
  inputClass: (field: string) => string;
  FieldError: React.ComponentType<{ field: string }>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Full Name *</label>
          <input type="text" value={resident.fullName} onChange={e => update("fullName", e.target.value)} placeholder="John Doe" className={inputClass("fullName")} />
          <FieldError field="fullName" />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Phone *</label>
          <input type="tel" value={resident.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" className={inputClass("phone")} />
          <FieldError field="phone" />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Email</label>
          <input type="email" value={resident.email} onChange={e => update("email", e.target.value)} placeholder="john@email.com" className={inputClass("email")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Gender</label>
          <select value={resident.gender} onChange={e => update("gender", e.target.value)} className={inputClass("gender")}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Date of Birth</label>
          <input type="date" value={resident.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} className={inputClass("dateOfBirth")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Blood Group</label>
          <select value={resident.bloodGroup} onChange={e => update("bloodGroup", e.target.value)} className={inputClass("bloodGroup")}>
            <option value="">Select</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function ResidentIdentityStep({ resident, update, inputClass }: {
  resident: ResidentFormData;
  update: (field: string, value: string | number) => void;
  inputClass: (field: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Aadhaar Number</label>
          <input type="text" value={resident.aadhaarNumber} onChange={e => update("aadhaarNumber", e.target.value)} placeholder="1234 5678 9012" maxLength={14} className={inputClass("aadhaarNumber")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">PAN Number</label>
          <input type="text" value={resident.panNumber} onChange={e => update("panNumber", e.target.value)} placeholder="ABCDE1234F" maxLength={10} className={inputClass("panNumber")} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Passport Number (if applicable)</label>
          <input type="text" value={resident.passportNumber} onChange={e => update("passportNumber", e.target.value)} placeholder="A1234567" className={inputClass("passportNumber")} />
        </div>
      </div>
    </div>
  );
}

function ResidentEmploymentStep({ resident, update, inputClass }: {
  resident: ResidentFormData;
  update: (field: string, value: string | number) => void;
  inputClass: (field: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Occupation</label>
          <input type="text" value={resident.occupation} onChange={e => update("occupation", e.target.value)} placeholder="Software Engineer" className={inputClass("occupation")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Company</label>
          <input type="text" value={resident.companyName} onChange={e => update("companyName", e.target.value)} placeholder="Company name" className={inputClass("companyName")} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Work Address</label>
          <input type="text" value={resident.workAddress} onChange={e => update("workAddress", e.target.value)} placeholder="Office address" className={inputClass("workAddress")} />
        </div>
      </div>
    </div>
  );
}

function ResidentEmergencyStep({ resident, update, inputClass }: {
  resident: ResidentFormData;
  update: (field: string, value: string | number) => void;
  inputClass: (field: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Contact Name</label>
          <input type="text" value={resident.emergencyName} onChange={e => update("emergencyName", e.target.value)} placeholder="Emergency contact name" className={inputClass("emergencyName")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Phone</label>
          <input type="tel" value={resident.emergencyPhone} onChange={e => update("emergencyPhone", e.target.value)} placeholder="+91 98765 43210" className={inputClass("emergencyPhone")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Relationship</label>
          <select value={resident.emergencyRelation} onChange={e => update("emergencyRelation", e.target.value)} className={inputClass("emergencyRelation")}>
            <option value="">Select</option>
            {["Parent", "Spouse", "Sibling", "Friend", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function ResidentFinancialStep({ resident, update, inputClass, moveInDate }: {
  resident: ResidentFormData;
  update: (field: string, value: string | number) => void;
  inputClass: (field: string) => string;
  moveInDate: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Move-in Date</label>
          <input type="date" value={moveInDate} onChange={e => update("moveInDate", e.target.value)} className={inputClass("moveInDate")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Monthly Rent (₹)</label>
          <input type="number" value={resident.rentAmount} onChange={e => update("rentAmount", Number(e.target.value))} placeholder="5000" min="0" className={inputClass("rentAmount")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Deposit Paid (₹)</label>
          <input type="number" value={resident.depositPaid} onChange={e => update("depositPaid", Number(e.target.value))} placeholder="10000" min="0" className={inputClass("depositPaid")} />
        </div>
      </div>
    </div>
  );
}

function ResidentFoodStep({ resident, update, inputClass }: {
  resident: ResidentFormData;
  update: (field: string, value: string | number) => void;
  inputClass: (field: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Food Preference</label>
          <select value={resident.foodPreference} onChange={e => update("foodPreference", e.target.value)} className={inputClass("foodPreference")}>
            <option value="vegetarian">Vegetarian</option>
            <option value="non-vegetarian">Non-Vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Meal Plan</label>
          <select value={resident.mealPlan} onChange={e => update("mealPlan", e.target.value)} className={inputClass("mealPlan")}>
            <option value="both">All Meals (Breakfast + Dinner)</option>
            <option value="breakfast">Breakfast Only</option>
            <option value="dinner">Dinner Only</option>
            <option value="none">No Meals</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Special Dietary Requirements</label>
          <input type="text" value={resident.specialDietary} onChange={e => update("specialDietary", e.target.value)} placeholder="e.g. Gluten-free, diabetic diet" className={inputClass("specialDietary")} />
        </div>
      </div>
    </div>
  );
}

function ResidentReviewStep({ resident, index, total }: {
  resident: ResidentFormData;
  index: number;
  total: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">Review details for {resident.fullName || `Resident ${index + 1}`}</p>
      <div className="bg-canvas rounded-lg border border-border-subtle p-4 space-y-2">
        {[
          { label: "Name", value: resident.fullName || "—" },
          { label: "Phone", value: resident.phone || "—" },
          { label: "Email", value: resident.email || "—" },
          { label: "Gender", value: resident.gender },
          { label: "Bed ID", value: resident.bedId || "—" },
          { label: "Rent", value: formatCurrency(resident.rentAmount) },
          { label: "Deposit", value: formatCurrency(resident.depositPaid) },
          { label: "Food", value: resident.foodPreference },
          { label: "Meal Plan", value: resident.mealPlan },
        ].map(item => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-ink-muted">{item.label}</span>
            <span className="font-medium text-ink">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalReviewStep({ residents, moveInDate }: { residents: ResidentFormData[]; moveInDate: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-ink uppercase tracking-wide">Review All Residents</h3>
      <p className="text-sm text-ink-muted">Please review all details before completing the check-in.</p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {residents.map((r, i) => (
          <div key={r.bedId || i} className="bg-canvas rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-ink">{r.fullName || `Resident ${i + 1}`}</h4>
              <Badge variant="outline" className="text-xs capitalize">{r.gender}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-ink-muted">Phone:</span> <span className="font-medium text-ink ml-1">{r.phone}</span></div>
              <div><span className="text-ink-muted">Email:</span> <span className="font-medium text-ink ml-1">{r.email || "—"}</span></div>
              <div><span className="text-ink-muted">Bed:</span> <span className="font-medium text-ink ml-1">{r.bedId}</span></div>
              <div><span className="text-ink-muted">Rent:</span> <span className="font-medium text-ink ml-1">{formatCurrency(r.rentAmount)}</span></div>
              <div><span className="text-ink-muted">Deposit:</span> <span className="font-medium text-ink ml-1">{formatCurrency(r.depositPaid)}</span></div>
              <div><span className="text-ink-muted">Food:</span> <span className="font-medium text-ink ml-1">{r.foodPreference}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
        <div className="flex justify-between text-sm">
          <span className="text-ink-muted">Total Residents</span>
          <span className="font-bold text-ink">{residents.length}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ink-muted">Total Monthly Rent</span>
          <span className="font-bold text-ink">{formatCurrency(residents.reduce((sum, r) => sum + r.rentAmount, 0))}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ink-muted">Total Deposit</span>
          <span className="font-bold text-ink">{formatCurrency(residents.reduce((sum, r) => sum + r.depositPaid, 0))}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ink-muted">Move-in Date</span>
          <span className="font-bold text-ink">{moveInDate}</span>
        </div>
      </div>
    </div>
  );
}