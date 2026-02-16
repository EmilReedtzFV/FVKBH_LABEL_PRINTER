import { useState } from "react";
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
  size: z.enum(["small", "medium", "large"]),
});

type LabelFormValues = z.infer<typeof labelSchema>;

const SIZES = {
  small: { width: "50mm", height: "30mm", label: "Lille (50x30mm)" },
  medium: { width: "70mm", height: "40mm", label: "Mellem (70x40mm)" },
  large: { width: "90mm", height: "50mm", label: "Stor (90x50mm)" },
};

export default function LabelGenerator() {
  const { toast } = useToast();
  const [labelData, setLabelData] = useState<LabelFormValues>({
    name: "Kamera 1",
    id: "CAM-001",
    group: "Kit 1",
    size: "medium",
  });

  const form = useForm<LabelFormValues>({
    resolver: zodResolver(labelSchema),
    defaultValues: labelData,
  });

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

  const currentSize = SIZES[labelData.size];

  // Component for the actual label content to be reused
  const LabelContent = ({ data, size, isPreview = false }: { data: LabelFormValues; size: typeof currentSize; isPreview?: boolean }) => {
    // Calculate layout values based on size
    const isSmall = data.size === 'small';
    const isMedium = data.size === 'medium';
    
    // Header/Footer height
    const barHeight = isSmall ? '5mm' : isMedium ? '7mm' : '8mm';
    
    // Font sizes
    const groupFontSize = isSmall ? '10px' : isMedium ? '12px' : '14px';
    const titleFontSize = isSmall ? '10px' : isMedium ? '12px' : '14px';
    const idFontSize = isSmall ? '14px' : isMedium ? '18px' : '20px';
    const phoneFontSize = isSmall ? '8px' : isMedium ? '9px' : '10px';
    
    // Logo size
    const logoHeight = isSmall ? '12px' : isMedium ? '16px' : '20px';

    return (
      <div
        className="bg-white text-black relative flex flex-col overflow-hidden border-0"
        style={{
          width: size.width,
          height: size.height,
          boxSizing: "border-box",
          pageBreakInside: "avoid",
          border: isPreview ? '1px solid #e5e7eb' : 'none'
        }}
      >
        {/* Top Bar - Black */}
        <div 
          className="bg-black text-white flex items-center justify-between px-3 w-full"
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
        <div className="flex-1 flex items-center bg-white p-1">
          <div className="flex w-full h-full items-center">
            {/* QR Code */}
            <div className="h-full aspect-square flex items-center justify-center p-1">
              <QRCode
                value={data.id}
                style={{ height: "100%", width: "100%", maxWidth: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>
            
            {/* Divider */}
            <div className="h-[80%] w-[2px] bg-black mx-2 rounded-full"></div>

            {/* Text Info */}
            <div className="flex-1 flex flex-col justify-center h-full overflow-hidden">
               <div className="font-bold uppercase leading-tight" style={{ fontSize: titleFontSize }}>
                 {data.name}
               </div>
               <div className="font-mono font-bold tracking-widest mt-1" style={{ fontSize: idFontSize }}>
                 {data.id}
               </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Black */}
        <div 
          className="bg-black text-white flex items-center justify-center w-full"
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

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Størrelse</FormLabel>
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
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
            <CardContent className="flex-1 flex items-center justify-center bg-muted/20 p-8 rounded-lg border-dashed border-2 m-6">
              <LabelContent data={labelData} size={currentSize} isPreview={true} />
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
        <LabelContent data={labelData} size={currentSize} />
      </div>
    </div>
  );
}
