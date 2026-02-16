import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema for the label form
const labelSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet"),
  id: z.string().min(1, "ID nummer er påkrævet"),
  group: z.string().optional(),
  width: z.number().min(20, "Minimum bredde er 20mm").max(100, "Maksimum bredde er 100mm"),
  height: z.number().min(10, "Minimum højde er 10mm").max(300, "Maksimum højde er 300mm"),
  preset: z.string().optional(),
});

type LabelFormValues = z.infer<typeof labelSchema>;

const PRESETS = {
  small: { width: 50, height: 30, label: "Lille (50x30mm)" },
  medium: { width: 70, height: 40, label: "Mellem (70x40mm)" },
  large: { width: 90, height: 50, label: "Stor (90x50mm)" },
  custom: { width: 0, height: 0, label: "Brugerdefineret" },
};

export default function LabelGenerator() {
  const { toast } = useToast();
  const [labelData, setLabelData] = useState<LabelFormValues>({
    name: "Kamera 1",
    id: "CAM-001",
    group: "Kit 1",
    width: 70,
    height: 40,
    preset: "medium",
  });

  const form = useForm<LabelFormValues>({
    resolver: zodResolver(labelSchema),
    defaultValues: labelData,
  });

  // Watch preset changes to update width/height
  const watchPreset = form.watch("preset");

  useEffect(() => {
    if (watchPreset && watchPreset !== "custom") {
        const preset = PRESETS[watchPreset as keyof typeof PRESETS];
        if (preset) {
            form.setValue("width", preset.width);
            form.setValue("height", preset.height);
        }
    }
  }, [watchPreset, form]);

  const onSubmit = (data: LabelFormValues) => {
    setLabelData(data);
    toast({
      title: "Label opdateret",
      description: "Visningen er blevet opdateret med de nye data.",
    });
  };

  const generateRandomId = () => {
    const randomId = `EQ-${Math.floor(1000 + Math.random() * 9000)}`;
    form.setValue("id", randomId);
  };

  const handlePrint = () => {
    window.print();
  };

  // Component for the actual label content to be reused
  const LabelContent = ({ data, isPreview = false }: { data: LabelFormValues; isPreview?: boolean }) => {
    // Dynamic size calculations based on actual dimensions
    const width = data.width;
    const height = data.height;
    
    // Bar height is always ~15% of total height
    const barHeightMm = height * 0.15;
    const barHeight = `${barHeightMm}mm`;
    
    // Scale factor based on smallest dimension for fonts
    const minDim = Math.min(width, height);
    
    // Font sizes proportional to label size
    const groupFontSize = `${Math.max(7, minDim * 0.18)}px`;
    const titleFontSize = `${Math.max(7, minDim * 0.18)}px`;
    const idFontSize = `${Math.max(10, minDim * 0.28)}px`;
    const phoneFontSize = `${Math.max(5, minDim * 0.12)}px`;
    
    // Logo size proportional to bar height
    const logoHeight = `${Math.max(8, barHeightMm * 2.5)}px`;

    // Determine layout based on aspect ratio
    const isPortrait = height > width * 1.2; // If height is significantly larger than width
    const isSquareish = !isPortrait && (height > width * 0.8); // If it's roughly square

    return (
      <div
        className="bg-white text-black relative flex flex-col overflow-hidden border-0"
        style={{
          width: `${width}mm`,
          height: `${height}mm`,
          boxSizing: "border-box",
          pageBreakInside: "avoid",
          border: isPreview ? '1px solid #e5e7eb' : 'none'
        }}
      >
        {/* Top Bar - Black */}
        <div 
          className="bg-black text-white flex items-center justify-between px-3 w-full flex-shrink-0"
          style={{ height: barHeight }}
        >
           <div className="flex items-center">
             <img 
                src="/logo.png" 
                alt="Logo" 
                className="object-contain filter invert brightness-0 saturate-100 invert-[1]"
                style={{ height: logoHeight }} 
             />
           </div>
           {data.group && (
             <div className="font-bold tracking-wider uppercase" style={{ fontSize: groupFontSize }}>
               {data.group}
             </div>
           )}
        </div>

        {/* Middle Section - White with QR and Text */}
        <div className="flex-1 flex items-center bg-white p-1 min-h-0 relative">
          <div className={`flex w-full h-full ${isPortrait || isSquareish ? 'flex-col justify-between py-2' : 'flex-row items-center justify-center'}`}>
            
            {/* QR Code */}
            <div className={`flex items-center justify-center p-1 ${isPortrait || isSquareish ? 'h-[55%] w-full' : 'h-full aspect-square'}`}>
              <QRCode
                value={data.id}
                style={{ height: "100%", width: "100%", maxWidth: "100%", objectFit: "contain" }}
                viewBox={`0 0 256 256`}
              />
            </div>
            
            {/* Divider */}
            {isPortrait || isSquareish ? (
               <div className="w-[80%] h-[2px] bg-black my-1 rounded-full flex-shrink-0"></div>
            ) : (
               <div className="h-[80%] w-[2px] bg-black mx-2 rounded-full flex-shrink-0"></div>
            )}

            {/* Text Info */}
            <div className={`flex-1 flex flex-col justify-center overflow-hidden min-w-0 ${isPortrait || isSquareish ? 'w-full items-center text-center px-1' : 'h-full'}`}>
               <div className="font-bold uppercase leading-tight truncate w-full" style={{ fontSize: titleFontSize }}>
                 {data.name}
               </div>
               <div className="font-mono font-bold tracking-widest mt-1 truncate w-full" style={{ fontSize: idFontSize }}>
                 {data.id}
               </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Black */}
        <div 
          className="bg-black text-white flex items-center justify-center w-full flex-shrink-0"
          style={{ height: barHeight }}
        >
           <div className="font-bold tracking-widest" style={{ fontSize: phoneFontSize }}>
             +45 71 99 33 66
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-8 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Label Generator</h1>
            <p className="text-muted-foreground mt-2">
              Generer labels til udstyr med QR-koder. Klar til Zebra ZD621t.
            </p>
          </div>
          <Button onClick={handlePrint} size="lg" className="gap-2">
            <Printer className="h-5 w-5" />
            Print Label
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Konfiguration</CardTitle>
              <CardDescription>Indtast oplysninger til labelen.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Navn på udstyr</FormLabel>
                        <FormControl>
                          <Input placeholder="F.eks. Kamera 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="id"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>ID Nummer</FormLabel>
                          <FormControl>
                            <Input placeholder="F.eks. CAM-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateRandomId}
                      title="Generer tilfældigt ID"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="group"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gruppe / Kit</FormLabel>
                        <FormControl>
                          <Input placeholder="F.eks. Kit 1, Lyd Kit 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="preset"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Størrelse Preset</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Vælg størrelse" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="small">Lille (50x30mm)</SelectItem>
                                <SelectItem value="medium">Mellem (70x40mm)</SelectItem>
                                <SelectItem value="large">Stor (90x50mm)</SelectItem>
                                <SelectItem value="custom">Brugerdefineret</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bredde (mm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => {
                                    field.onChange(Number(e.target.value));
                                    form.setValue("preset", "custom");
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Højde (mm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => {
                                    field.onChange(Number(e.target.value));
                                    form.setValue("preset", "custom");
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>

                  <Button type="submit" className="w-full">
                    Opdater Visning
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Forhåndsvisning</CardTitle>
              <CardDescription>
                Dette er hvordan labelen ser ud. Brug print-knappen for at udskrive.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center bg-muted/20 p-8 rounded-lg border-dashed border-2 m-6 overflow-auto">
              <LabelContent data={labelData} isPreview={true} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Area - Only visible when printing */}
      <div className="hidden print:block fixed top-0 left-0">
        <style type="text/css" media="print">
          {`
            @page {
              size: auto;
              margin: 0mm;
            }
            body {
              background: white;
            }
          `}
        </style>
        <LabelContent data={labelData} />
      </div>
    </div>
  );
}
