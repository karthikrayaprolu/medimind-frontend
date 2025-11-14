import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { UploadCloud, Scan, FileText, BellRing, LogOut, Database, CircuitBoard, Pill, Clock, Trash2, Power, PowerOff, Calendar, Loader2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { prescriptionApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Schedule {
  _id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  timings: string[];
  enabled: boolean;
  created_at: string;
}

interface Prescription {
  _id: string;
  raw_text: string;
  structured_data: string;
  created_at: string;
}

const workflowSteps = [
  {
    icon: UploadCloud,
    title: "Intake & Verification",
    description: "Authenticated uploads land in temporary storage with validation and timestamping.",
  },
  {
    icon: Scan,
    title: "OCR Processing",
    description: "EasyOCR workers parse handwriting and surface extracted medication directives.",
  },
  {
    icon: FileText,
    title: "Structured Insight",
    description: "LLM services transform notes into validated medicine objects ready for scheduling.",
  },
  {
    icon: Database,
    title: "Persistent History",
    description: "MongoDB captures raw text, structured payloads, and reminders for review.",
  },
  {
    icon: BellRing,
    title: "Reminder Automation",
    description: "Dosage patterns convert into reminders delivered via email or push notifications.",
  },
];

const Dashboard = () => {
  const { logout, token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [schedulesData, prescriptionsData] = await Promise.all([
        prescriptionApi.getUserSchedules(token!),
        prescriptionApi.getUserPrescriptions(token!),
      ]);
      setSchedules(schedulesData);
      setPrescriptions(prescriptionsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { authApi } = await import("@/lib/api");
      await authApi.logout();
      logout();
      toast({ title: "Signed out", description: "You have exited the MediMind workspace." });
      navigate("/", { replace: true });
    } catch (error) {
      logout();
      navigate("/", { replace: true });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    try {
      const result = await prescriptionApi.uploadPrescription(file, token);
      toast({
        title: "Prescription uploaded!",
        description: `${result.medicines.length} medicine(s) extracted and scheduled.`,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload prescription",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleToggleSchedule = async (scheduleId: string, currentState: boolean) => {
    try {
      await prescriptionApi.toggleSchedule(scheduleId, !currentState);
      setSchedules(schedules.map(s => s._id === scheduleId ? { ...s, enabled: !currentState } : s));
      toast({
        title: currentState ? "Schedule disabled" : "Schedule enabled",
        description: `Reminder has been ${currentState ? "paused" : "activated"}.`,
      });
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Failed to update schedule",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await prescriptionApi.deleteSchedule(scheduleId);
      setSchedules(schedules.filter(s => s._id !== scheduleId));
      toast({
        title: "Schedule deleted",
        description: "The medication schedule has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete schedule",
        variant: "destructive",
      });
    }
  };

  const getTimingBadgeColor = (timing: string) => {
    const colors: Record<string, string> = {
      morning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      afternoon: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      evening: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      night: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    return colors[timing.toLowerCase()] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">MediMind Workspace</h1>
              <p className="text-xs text-muted-foreground">Prescription management powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload Prescription
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="inline-flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: "Total Prescriptions", value: prescriptions.length, icon: FileText, color: "from-blue-500 to-cyan-500" },
            { label: "Active Schedules", value: schedules.filter(s => s.enabled).length, icon: Calendar, color: "from-green-500 to-emerald-500" },
            { label: "Medications", value: schedules.length, icon: Pill, color: "from-purple-500 to-pink-500" },
            { label: "Reminders Set", value: schedules.reduce((acc, s) => acc + s.timings.length, 0), icon: BellRing, color: "from-orange-500 to-red-500" },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden border-border/60 bg-card/95 p-6 shadow-lg">
                  <div className={cn("absolute right-0 top-0 h-full w-2 bg-gradient-to-b", stat.color)} />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="mt-2 text-3xl font-bold text-foreground">{isLoading ? "—" : stat.value}</p>
                    </div>
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br", stat.color, "text-white")}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.section>

        {/* Active Schedules */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-border/60 bg-card/95 shadow-lg">
            <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Medication Schedules</h2>
                  <p className="text-xs text-muted-foreground">Manage your medicine reminders</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Pill className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">No schedules yet</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Upload a prescription to get started</p>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload Prescription
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence>
                    {schedules.map((schedule, index) => (
                      <motion.div
                        key={schedule._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border bg-background p-4 transition-all hover:shadow-md",
                          schedule.enabled ? "border-primary/20" : "border-border/50 opacity-60"
                        )}
                      >
                        {schedule.enabled && (
                          <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-secondary" />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <Pill className={cn("h-4 w-4", schedule.enabled ? "text-primary" : "text-muted-foreground")} />
                              <h3 className="font-semibold text-foreground">{schedule.medicine_name}</h3>
                            </div>
                            <div className="space-y-1.5 text-sm">
                              <p className="text-muted-foreground">
                                <span className="font-medium">Dosage:</span> {schedule.dosage}
                              </p>
                              <p className="text-muted-foreground">
                                <span className="font-medium">Frequency:</span> {schedule.frequency}
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {schedule.timings.map((timing) => (
                                  <span
                                    key={timing}
                                    className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", getTimingBadgeColor(timing))}
                                  >
                                    {timing}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleSchedule(schedule._id, schedule.enabled)}
                              className="h-8 w-8 p-0"
                            >
                              {schedule.enabled ? (
                                <Power className="h-4 w-4 text-green-600" />
                              ) : (
                                <PowerOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSchedule(schedule._id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </Card>
        </motion.section>

        {/* Workflow Pipeline */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-border/60 bg-card/95 shadow-lg">
            <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <CircuitBoard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Processing Pipeline</h2>
                  <p className="text-xs text-muted-foreground">How your prescriptions are handled</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                      className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
                      <div className="relative">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 transition-transform group-hover:scale-110">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="mb-2 text-sm font-semibold text-foreground">{step.title}</h3>
                        <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default Dashboard;
