import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import Barcode from "react-barcode";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Printer, Tag, Cable, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LabelMode = "equipment" | "cable";

// Schema for the equipment label form
const equipmentSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet"),
  id: z.string().min(1, "ID nummer er påkrævet"),
  group: z.string().optional(),
  width: z.number().min(20, "Minimum bredde er 20mm").max(100, "Maksimum bredde er 100mm"),
  height: z.number().min(10, "Minimum højde er 10mm").max(300, "Maksimum højde er 300mm"),
  preset: z.string().optional(),
});

// Schema for the cable label form
const cableSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet"),
  id: z.string().min(1, "ID nummer er påkrævet"),
  group: z.string().optional(),
  codeType: z.enum(["qr", "barcode", "none"]),
  width: z.number().min(30, "Minimum bredde er 30mm").max(100, "Maksimum bredde er 100mm"),
  height: z.number().min(5, "Minimum højde er 5mm").max(20, "Maksimum højde er 20mm"),
  preset: z.string().optional(),
});

type EquipmentFormValues = z.infer<typeof equipmentSchema>;
type CableFormValues = z.infer<typeof cableSchema>;

const ASPECT_RATIOS: Record<string, { w: number; h: number; label: string }> = {
  "4:3": { w: 4, h: 3, label: "4:3" },
  "2:1": { w: 2, h: 1, label: "2:1" },
  "1:1": { w: 1, h: 1, label: "1:1" },
  "16:9": { w: 16, h: 9, label: "16:9" },
  "4:5": { w: 4, h: 5, label: "4:5" },
  "2.35:1": { w: 2.35, h: 1, label: "2.35:1" },
  custom: { w: 0, h: 0, label: "Fri" },
};

const CABLE_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  small: { width: 50, height: 8, label: "Lille (50x8mm)" },
  medium: { width: 70, height: 10, label: "Mellem (70x10mm)" },
  large: { width: 90, height: 12, label: "Stor (90x12mm)" },
  custom: { width: 0, height: 0, label: "Brugerdefineret" },
};

// Equipment Label Component

// Design A: Top bar with company info, QR left, text right (horizontal)
function EquipmentLabelDesignA({ data, isPreview = false }: { data: EquipmentFormValues; isPreview?: boolean }) {
  const { width, height } = data;
  const minDim = Math.min(width, height);
  const groupFs = `${Math.max(6, minDim * 0.12)}px`;
  const nameFs = `${Math.max(8, minDim * 0.22)}px`;
  const idFs = `${Math.max(7, minDim * 0.15)}px`;
  const infoFs = `${Math.max(5, width * 0.06)}px`;
  const barH = `${Math.max(height * 0.14, 4)}mm`;
  const qrSize = Math.min(width * 0.35, height * 0.6);
  const logoH = `${Math.max(8, height * 0.1)}px`;

  return (
    <div className="bg-black text-white relative flex flex-col overflow-hidden border-0" style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none' }}>
      <div className="bg-white text-black flex items-center justify-center px-1 w-full flex-shrink-0 gap-1" style={{ height: barH }}>
        <img src="/logo.png" alt="Logo" className="object-contain flex-shrink-0" style={{ height: logoH }} />
        <span className="font-bold uppercase whitespace-nowrap flex-shrink-0" style={{ fontSize: infoFs }}>Filmværksted København</span>
        <span className="font-bold tracking-wider whitespace-nowrap flex-shrink-0" style={{ fontSize: infoFs }}>+45 71 99 33 66</span>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0 p-2 overflow-hidden">
        <div className="flex flex-row items-center gap-3 h-full max-w-full overflow-hidden">
          <div className="flex items-center justify-center flex-shrink-0 bg-white p-0.5 rounded" style={{ width: `${qrSize}mm`, height: `${qrSize}mm` }}>
            <QRCode value={data.id} style={{ height: "100%", width: "100%", maxWidth: "100%", objectFit: "contain" }} viewBox="0 0 256 256" />
          </div>
          <div className="h-[70%] w-[2px] bg-white rounded-full flex-shrink-0"></div>
          <div className="flex flex-col justify-center min-w-0 overflow-hidden">
            <div className="font-bold uppercase leading-tight" style={{ fontSize: nameFs, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.15 }}>{data.name}</div>
            <div className="font-mono tracking-widest mt-1 text-gray-400" style={{ fontSize: idFs, wordBreak: 'break-all', overflowWrap: 'break-word', lineHeight: 1.1 }}>#{data.id}</div>
            {data.group && (
              <div className="mt-1">
                <span className="bg-white text-black font-bold uppercase tracking-wider rounded inline-block" style={{ fontSize: groupFs, padding: '1px 6px' }}>{data.group}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentLabelContent({ data, isPreview = false }: { data: EquipmentFormValues; isPreview?: boolean }) {
  return <EquipmentLabelDesignA data={data} isPreview={isPreview} />;
}

// Cable Label Component - narrow strip that wraps around a cable
function CableLabelContent({ data, isPreview = false }: { data: CableFormValues; isPreview?: boolean }) {
  const width = data.width;
  const height = data.height;

  const fontSize = `${Math.max(6, height * 0.55)}px`;
  const smallFontSize = `${Math.max(5, height * 0.35)}px`;
  const logoH = `${Math.max(10, height * 1.8)}px`;
  const hasCode = data.codeType !== "none";
  const codeSize = height * 0.85;

  return (
    <div
      className="bg-white text-black relative flex overflow-hidden"
      style={{
        width: `${width}mm`,
        height: `${height}mm`,
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        border: isPreview ? '1px solid #e5e7eb' : 'none'
      }}
    >
      {/* Left black section with logo + phone */}
      <div
        className="bg-black text-white flex items-center justify-center gap-1 flex-shrink-0 px-2"
        style={{ width: `${Math.max(20, width * 0.3)}mm` }}
      >
        <img
          src="/logo.png"
          alt="Logo"
          className="object-contain filter invert brightness-0 saturate-100 invert-[1]"
          style={{ height: logoH, maxWidth: '50%' }}
        />
        <span className="font-bold whitespace-nowrap" style={{ fontSize: smallFontSize }}>
          +45 71 99 33 66
        </span>
      </div>

      {/* QR or Barcode section */}
      {hasCode && (
        <div className="flex items-center justify-center flex-shrink-0 bg-white px-1"
          style={{ height: '100%' }}
        >
          {data.codeType === "qr" ? (
            <QRCode
              value={data.id}
              style={{ height: `${codeSize}mm`, width: `${codeSize}mm` }}
              viewBox="0 0 256 256"
            />
          ) : (
            <Barcode
              value={data.id}
              height={Math.max(15, codeSize * 2.5)}
              width={1}
              displayValue={false}
              margin={0}
            />
          )}
        </div>
      )}

      {/* Main content - horizontal strip */}
      <div className="flex-1 flex items-center justify-between px-2 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-1">
          <span className="font-bold uppercase truncate whitespace-nowrap" style={{ fontSize }}>
            {data.name}
          </span>
          {data.group && (
            <span
              className="bg-black text-white px-1 rounded-sm font-bold uppercase truncate whitespace-nowrap flex-shrink-0"
              style={{ fontSize: smallFontSize }}
            >
              {data.group}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="font-mono font-bold whitespace-nowrap" style={{ fontSize }}>
            {data.id}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LabelGenerator() {
  const { toast } = useToast();
  const [mode, setMode] = useState<LabelMode>("equipment");

  const [labelData, setLabelData] = useState<EquipmentFormValues>({
    name: "Kamera 1",
    id: "CAM-001",
    group: "Kit 1",
    width: 80,
    height: 60,
    preset: "4:3",
  });

  const [cableData, setCableData] = useState<CableFormValues>({
    name: "SDI Kabel",
    id: "CBL-001",
    group: "Kit 1",
    codeType: "qr",
    width: 70,
    height: 10,
    preset: "medium",
  });

  const equipmentForm = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: labelData,
  });

  const cableForm = useForm<CableFormValues>({
    resolver: zodResolver(cableSchema),
    defaultValues: cableData,
  });

  const watchEquipmentPreset = equipmentForm.watch("preset");
  const watchCablePreset = cableForm.watch("preset");

  useEffect(() => {
    if (watchEquipmentPreset && watchEquipmentPreset !== "custom") {
      const ratio = ASPECT_RATIOS[watchEquipmentPreset];
      if (ratio) {
        const currentWidth = equipmentForm.getValues("width");
        const newHeight = Math.round(currentWidth / (ratio.w / ratio.h));
        equipmentForm.setValue("height", newHeight);
      }
    }
  }, [watchEquipmentPreset, equipmentForm]);

  useEffect(() => {
    if (watchCablePreset && watchCablePreset !== "custom") {
      const preset = CABLE_PRESETS[watchCablePreset];
      if (preset) {
        cableForm.setValue("width", preset.width);
        cableForm.setValue("height", preset.height);
      }
    }
  }, [watchCablePreset, cableForm]);

  const onEquipmentSubmit = (data: EquipmentFormValues) => {
    setLabelData(data);
    toast({ title: "Label opdateret", description: "Visningen er blevet opdateret." });
  };

  const onCableSubmit = (data: CableFormValues) => {
    setCableData(data);
    toast({ title: "Kabel label opdateret", description: "Visningen er blevet opdateret." });
  };

  const generateRandomId = () => {
    const prefix = mode === "cable" ? "CBL" : "EQ";
    const randomId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (mode === "equipment") {
      equipmentForm.setValue("id", randomId);
    } else {
      cableForm.setValue("id", randomId);
    }
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-8 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground" data-testid="text-title">Label Generator</h1>
            <p className="text-muted-foreground mt-2">
              Generer labels til udstyr og kabler med QR-koder. Klar til Zebra ZD621t.
            </p>
          </div>
          <Button onClick={handlePrint} size="lg" className="gap-2" data-testid="button-print">
            <Printer className="h-5 w-5" />
            Print Label
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "equipment" ? "default" : "outline"}
            onClick={() => setMode("equipment")}
            className="gap-2"
            data-testid="button-mode-equipment"
          >
            <Tag className="h-4 w-4" />
            Udstyr Label
          </Button>
          <Button
            variant={mode === "cable" ? "default" : "outline"}
            onClick={() => setMode("cable")}
            className="gap-2"
            data-testid="button-mode-cable"
          >
            <Cable className="h-4 w-4" />
            Kabel Label
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>{mode === "equipment" ? "Udstyr Konfiguration" : "Kabel Konfiguration"}</CardTitle>
              <CardDescription>
                {mode === "equipment"
                  ? "Indtast oplysninger til udstyr-labelen."
                  : "Indtast oplysninger til kabel-labelen. Denne vikles rundt om kablet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "equipment" ? (
                <Form {...equipmentForm}>
                  <form onSubmit={equipmentForm.handleSubmit(onEquipmentSubmit)} className="space-y-6">
                    <FormField
                      control={equipmentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Navn på udstyr</FormLabel>
                          <FormControl>
                            <Input placeholder="F.eks. Kamera 1" {...field} data-testid="input-equipment-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-4 items-end">
                      <FormField
                        control={equipmentForm.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>ID Nummer</FormLabel>
                            <FormControl>
                              <Input placeholder="F.eks. CAM-001" {...field} data-testid="input-equipment-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="outline" onClick={generateRandomId} title="Generer tilfældigt ID" data-testid="button-random-id">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormField
                      control={equipmentForm.control}
                      name="group"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gruppe / Kit</FormLabel>
                          <FormControl>
                            <Input placeholder="F.eks. Kit 1, Lyd Kit 2" {...field} data-testid="input-equipment-group" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={equipmentForm.control}
                        name="preset"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Formatforhold</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-equipment-preset">
                                  <SelectValue placeholder="Vælg formatforhold" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(ASPECT_RATIOS).map(([key, val]) => (
                                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end gap-2">
                        <FormField
                          control={equipmentForm.control}
                          name="width"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Bredde (mm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => {
                                    const newW = Number(e.target.value);
                                    field.onChange(newW);
                                    const preset = equipmentForm.getValues("preset");
                                    if (preset && preset !== "custom") {
                                      const ratio = ASPECT_RATIOS[preset];
                                      if (ratio) {
                                        equipmentForm.setValue("height", Math.round(newW / (ratio.w / ratio.h)));
                                      }
                                    }
                                  }}
                                  data-testid="input-equipment-width"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0 mb-0.5"
                          data-testid="button-swap-equipment-dimensions"
                          onClick={() => {
                            const w = equipmentForm.getValues("width");
                            const h = equipmentForm.getValues("height");
                            equipmentForm.setValue("width", h);
                            equipmentForm.setValue("height", w);
                            equipmentForm.setValue("preset", "custom");
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <FormField
                          control={equipmentForm.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Højde (mm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => {
                                    const newH = Number(e.target.value);
                                    field.onChange(newH);
                                    const preset = equipmentForm.getValues("preset");
                                    if (preset && preset !== "custom") {
                                      const ratio = ASPECT_RATIOS[preset];
                                      if (ratio) {
                                        equipmentForm.setValue("width", Math.round(newH * (ratio.w / ratio.h)));
                                      }
                                    }
                                  }}
                                  data-testid="input-equipment-height"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-update-equipment">Opdater Visning</Button>
                  </form>
                </Form>
              ) : (
                <Form {...cableForm}>
                  <form onSubmit={cableForm.handleSubmit(onCableSubmit)} className="space-y-6">
                    <FormField
                      control={cableForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kabel navn</FormLabel>
                          <FormControl>
                            <Input placeholder="F.eks. SDI Kabel 3m" {...field} data-testid="input-cable-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-4 items-end">
                      <FormField
                        control={cableForm.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>ID Nummer</FormLabel>
                            <FormControl>
                              <Input placeholder="F.eks. CBL-001" {...field} data-testid="input-cable-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="outline" onClick={generateRandomId} title="Generer tilfældigt ID" data-testid="button-cable-random-id">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormField
                      control={cableForm.control}
                      name="group"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gruppe / Kit</FormLabel>
                          <FormControl>
                            <Input placeholder="F.eks. Kit 1, Lyd Kit 2" {...field} data-testid="input-cable-group" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={cableForm.control}
                      name="codeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kode Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-cable-codetype">
                                <SelectValue placeholder="Vælg kode type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="qr">QR Kode</SelectItem>
                              <SelectItem value="barcode">Stregkode</SelectItem>
                              <SelectItem value="none">Ingen kode</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={cableForm.control}
                        name="preset"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Størrelse Preset</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-cable-preset">
                                  <SelectValue placeholder="Vælg størrelse" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="small">Lille (50x8mm)</SelectItem>
                                <SelectItem value="medium">Mellem (70x10mm)</SelectItem>
                                <SelectItem value="large">Stor (90x12mm)</SelectItem>
                                <SelectItem value="custom">Brugerdefineret</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end gap-2">
                        <FormField
                          control={cableForm.control}
                          name="width"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Bredde (mm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => { field.onChange(Number(e.target.value)); cableForm.setValue("preset", "custom"); }}
                                  data-testid="input-cable-width"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0 mb-0.5"
                          data-testid="button-swap-cable-dimensions"
                          onClick={() => {
                            const w = cableForm.getValues("width");
                            const h = cableForm.getValues("height");
                            cableForm.setValue("width", h);
                            cableForm.setValue("height", w);
                            cableForm.setValue("preset", "custom");
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <FormField
                          control={cableForm.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Højde (mm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => { field.onChange(Number(e.target.value)); cableForm.setValue("preset", "custom"); }}
                                  data-testid="input-cable-height"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-update-cable">Opdater Visning</Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Forhåndsvisning</CardTitle>
              <CardDescription>
                {mode === "equipment"
                  ? "Dette er hvordan labelen ser ud. Brug print-knappen for at udskrive."
                  : "Kabel-labelen vikles rundt om kablet. Brug print-knappen for at udskrive."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-8 rounded-lg border-dashed border-2 m-6 overflow-auto gap-8">
              {mode === "equipment" ? (
                <EquipmentLabelContent data={labelData} isPreview={true} />
              ) : (
                <CableLabelContent data={cableData} isPreview={true} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Area */}
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
        {mode === "equipment" ? (
          <EquipmentLabelContent data={labelData} />
        ) : (
          <CableLabelContent data={cableData} />
        )}
      </div>
    </div>
  );
}
