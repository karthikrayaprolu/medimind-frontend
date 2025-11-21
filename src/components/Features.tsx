import { UploadCloud, Scan, ListChecks, BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";
import ScrollReveal from "@/components/ScrollReveal";
import ParallaxSection from "@/components/ParallaxSection";

const features = [
  {
    icon: UploadCloud,
    title: "Seamless Prescription Intake",
    description: "Authenticated uploads with optional compression keep every handwritten or printed prescription secure from the moment it hits the platform.",
  },
  {
    icon: Scan,
    title: "Reliable OCR Extraction",
    description: "An EasyOCR service cleans and interprets images to capture medicine names, strengths, and instructions with clinician-grade fidelity.",
  },
  {
    icon: ListChecks,
    title: "Structured Treatment Intelligence",
    description: "Language understanding services transform unstructured notes into validated JSON ready for scheduling, backed by Pydantic safeguards.",
  },
  {
    icon: BellRing,
    title: "Automated Reminders & History",
    description: "Dosage patterns become reminder timelines with notifications, audit trails, and searchable medication history stored in MongoDB.",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const Icon = feature.icon;

  return (
    <ScrollReveal animation="fade-up" delay={index * 0.1} className="h-full">
      <Card className="p-6 h-full bg-card hover:shadow-lg transition-all duration-300 border border-border group hover:border-primary/50">
        <div className="mb-4 w-12 h-12 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
      </Card>
    </ScrollReveal>
  );
};

const Features = () => {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up" className="mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Built for End-to-End Medication Clarity
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              MediMind captures every step of the prescription lifecycle so patients and caregivers always know what to take, when to take it, and why.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className={index % 2 === 0 ? "mt-0" : "mt-0 md:mt-8 lg:mt-12"}>
              {/* Add a slight offset to even/odd columns for a staggered look, 
                   or use ParallaxSection for dynamic movement */}
              <ParallaxSection speed={index % 2 === 0 ? 0 : 0.05}>
                <FeatureCard feature={feature} index={index} />
              </ParallaxSection>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
