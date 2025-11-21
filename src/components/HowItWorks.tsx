import { LogIn, UploadCloud, Server, Scan, FileText, CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import ScrollReveal from "@/components/ScrollReveal";
import ParallaxSection from "@/components/ParallaxSection";

const steps = [
  {
    icon: LogIn,
    title: "Authenticate Securely",
    description: "Users land on MediMind, sign in, and receive JWT-backed access so every action is tied to a verified identity.",
    number: "01",
  },
  {
    icon: UploadCloud,
    title: "Upload Prescription",
    description: "Images are optionally compressed on-device, then sent through the /upload-prescription endpoint with processing status updates.",
    number: "02",
  },
  {
    icon: Server,
    title: "Gateway Intake",
    description: "FastAPI receives the file, user metadata, and timestamps, staging each asset in temporary storage ready for downstream services.",
    number: "03",
  },
  {
    icon: Scan,
    title: "OCR Extraction",
    description: "An EasyOCR service cleans and interprets handwritten notes into dosage lines, normalizing text and fixing common recognition errors.",
    number: "04",
  },
  {
    icon: FileText,
    title: "Structured Understanding",
    description: "Language reasoning services convert raw text into validated JSON for medicines, dosing cadence, timings, and durations via Pydantic models.",
    number: "05",
  },
  {
    icon: CalendarCheck,
    title: "Reminders & History",
    description: "Schedules populate MongoDB alongside the source image, enabling automated notifications, PDF exports, edits, and longitudinal insights.",
    number: "06",
  },
];

const StepCard = ({ step, index }: { step: typeof steps[0]; index: number }) => {
  const Icon = step.icon;

  return (
    <ScrollReveal animation="fade-up" delay={index * 0.1} className="h-full">
      <Card className="p-6 h-full bg-card hover:shadow-lg transition-all duration-300 border border-border group hover:border-primary/50">
        <div className="mb-4 w-12 h-12 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-primary font-bold text-sm">Step {step.number}</span>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
      </Card>
    </ScrollReveal>
  );
};

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up" className="mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow the journey from upload to actionable medication support in six orchestrated stages.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div key={step.number}>
              <ParallaxSection speed={index % 2 === 0 ? 0 : 0.05}>
                <StepCard step={step} index={index} />
              </ParallaxSection>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;