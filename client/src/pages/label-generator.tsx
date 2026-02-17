import { useState, useEffect, useRef, useCallback } from "react";
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
import { RefreshCw, Printer, Tag, Cable, ArrowRightLeft, Upload, Trash2, Box, Plus, Wand2, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LabelMode = "equipment" | "cable" | "box";

interface ParsedItem {
  id: string;
  name: string;
  group: string;
}

// Schema for the equipment label form
const equipmentSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet"),
  id: z.string().min(1, "ID nummer er påkrævet"),
  group: z.string().optional(),
  width: z.number().min(10, "Minimum bredde er 10mm").max(100, "Maksimum bredde er 100mm"),
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

const boxSchema = z.object({
  kitName: z.string().min(1, "Kit navn er påkrævet"),
  width: z.number().min(50, "Minimum bredde er 50mm").max(200, "Maksimum bredde er 200mm"),
  height: z.number().min(20, "Minimum højde er 20mm").max(600, "Maksimum højde er 600mm"),
  autoHeight: z.boolean().optional(),
});

type EquipmentFormValues = z.infer<typeof equipmentSchema>;
type CableFormValues = z.infer<typeof cableSchema>;
type BoxFormValues = z.infer<typeof boxSchema>;

interface BoxItem {
  name: string;
  id?: string;
}

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
function EquipmentLabelDesignA({ data, isPreview = false, fontScale = 1 }: { data: EquipmentFormValues; isPreview?: boolean; fontScale?: number }) {
  const { width, height } = data;
  const s = fontScale;
  const isSmall = height < 20;
  const isNarrow = width < 20;
  const isTiny = isSmall || isNarrow;
  const showQr = data.id && !isTiny;

  const contentH = isSmall ? height * 0.78 : height * 0.82;
  const namePx = (isSmall
    ? Math.max(8, Math.min(width * 0.22, contentH * 0.45))
    : Math.max(8, Math.min(width, height) * 0.22)) * s;
  const idPx = (isSmall
    ? Math.max(6, Math.min(width * 0.16, contentH * 0.35))
    : Math.max(8, Math.min(width, height) * 0.19)) * s;
  const groupPx = (isSmall
    ? Math.max(5, Math.min(width * 0.1, contentH * 0.22))
    : Math.max(6, Math.min(width, height) * 0.12)) * s;
  const groupFs = `${groupPx}px`;
  const nameFs = `${namePx}px`;
  const idFs = `${idPx}px`;
  const infoFs = `${Math.max(4, Math.min(width * 0.08, height * 0.14))}px`;
  const barH = isSmall ? `${Math.max(height * 0.2, 2.5)}mm` : `${Math.max(height * 0.18, 5)}mm`;
  const isLarge = width >= 40 && height >= 40;
  const qrSize = Math.min(width * 0.3, height * 0.5);
  const logoH = `${Math.max(5, height * 0.12)}px`;
  const pad = isTiny ? '1mm 1mm' : isLarge ? `${height * 0.08}mm ${width * 0.06}mm` : '0.5rem';
  const contentGap = isTiny ? '2px' : isLarge ? `${width * 0.04}mm` : '0.75rem';

  return (
    <div data-label-root className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
      <div className="bg-white text-black flex items-center justify-center px-0.5 w-full flex-shrink-0 gap-0.5" style={{ height: barH, minHeight: 0 }}>
        <img src="/logo.png" alt="Logo" className="object-contain flex-shrink-0" style={{ height: logoH, maxHeight: '90%' }} />
        <span className="font-bold uppercase flex-shrink truncate" style={{ fontSize: infoFs, lineHeight: 1.1 }}>Filmværksted København</span>
        <span className="font-bold tracking-wider flex-shrink-0" style={{ fontSize: infoFs, lineHeight: 1.1 }}>+45 71 99 33 66</span>
      </div>
      <div data-label-content className="flex-1 flex items-center justify-center min-h-0" style={{ padding: pad, paddingTop: isTiny ? '1.5mm' : undefined }}>
        <div className="flex flex-row items-center h-full max-w-full" style={{ gap: contentGap }}>
          {showQr && (
            <>
              <div className="flex items-center justify-center flex-shrink-0 bg-white p-0.5 rounded" style={{ width: `${qrSize}mm`, height: `${qrSize}mm` }}>
                <QRCode value={data.id} style={{ height: "100%", width: "100%", maxWidth: "100%", objectFit: "contain" }} viewBox="0 0 256 256" />
              </div>
              <div className="h-[70%] w-[2px] bg-white rounded-full flex-shrink-0"></div>
            </>
          )}
          <div className="flex flex-col items-center min-w-0 w-full text-center" style={{ overflow: 'hidden', justifyContent: (data.id || data.group) ? 'space-evenly' : 'center', height: '100%' }}>
            <div className="font-bold uppercase leading-none" data-label-name style={{ fontSize: nameFs, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.1 }}>{data.name}</div>
            {data.id && (
              <div className="font-mono tracking-wider" data-label-id style={{ fontSize: idFs, wordBreak: 'break-all', overflowWrap: 'break-word', lineHeight: 1.1 }}>#{data.id}</div>
            )}
            {data.group && (
              <div>
                <span className="bg-white text-black font-bold uppercase tracking-wider rounded inline-block" data-label-group style={{ fontSize: groupFs, padding: isTiny ? '0px 2px' : '2px 8px', lineHeight: 1.15 }}>{data.group}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentLabelContent({ data, isPreview = false, fontScale = 1 }: { data: EquipmentFormValues; isPreview?: boolean; fontScale?: number }) {
  return <EquipmentLabelDesignA data={data} isPreview={isPreview} fontScale={fontScale} />;
}

// Cable Label Component - narrow strip that wraps around a cable
function CableLabelContent({ data, isPreview = false, fontScale = 1 }: { data: CableFormValues; isPreview?: boolean; fontScale?: number }) {
  const width = data.width;
  const height = data.height;
  const s = fontScale;

  const fontSize = `${Math.max(6, height * 0.55) * s}px`;
  const smallFontSize = `${Math.max(5, height * 0.35)}px`;
  const groupFontSize = `${Math.max(5, height * 0.35) * s}px`;
  const logoH = `${Math.max(10, height * 1.8)}px`;
  const hasCode = data.codeType !== "none";
  const codeSize = height * 0.85;

  return (
    <div
      data-label-root
      className="bg-white text-black relative flex overflow-hidden"
      style={{
        width: `${width}mm`,
        height: `${height}mm`,
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        border: isPreview ? '1px solid #e5e7eb' : 'none'
      }}
    >
      {/* Left black section with logo + phone + company */}
      <div
        className="bg-black text-white flex items-center justify-center gap-1 flex-shrink-0 px-2"
        style={{ width: `${Math.max(20, width * 0.3)}mm` }}
      >
        <img
          src="/logo.png"
          alt="Logo"
          className="object-contain filter invert brightness-0 saturate-100 invert-[1]"
          style={{ height: logoH, maxWidth: '30%' }}
        />
        <div className="flex flex-col items-center leading-none">
          <span className="font-bold whitespace-nowrap" style={{ fontSize: smallFontSize }}>
            +45 71 99 33 66
          </span>
          <span className="whitespace-nowrap" style={{ fontSize: `${Math.max(3, height * 0.22)}px` }}>
            Filmværksted København
          </span>
        </div>
      </div>

      {hasCode && data.id && (
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
      <div data-label-content className="flex-1 flex items-center justify-between px-1 min-w-0" style={{ overflow: 'hidden' }}>
        <div className="flex items-center gap-1 min-w-0 flex-1" style={{ overflow: 'hidden' }}>
          <span className="font-bold uppercase" style={{ fontSize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1 }} data-label-name>
            {data.name}
          </span>
          {data.group && (
            <span
              className="bg-black text-white px-1 rounded-sm font-bold uppercase flex-shrink-0"
              style={{ fontSize: groupFontSize, whiteSpace: 'nowrap' }}
            >
              {data.group}
            </span>
          )}
        </div>
        {data.id && (
          <div className="flex items-center flex-shrink-0 ml-1">
            <span className="font-mono font-bold" style={{ fontSize, whiteSpace: 'nowrap' }}>
              {data.id}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const BOX_LOGO_H = 14;
const BOX_KIT_H = 14;
const BOX_PADDING = 8;
const BOX_ITEM_ROW_H = 7;

function calcBoxAutoHeight(_width: number, itemCount: number): number {
  return Math.max(50, Math.ceil(BOX_LOGO_H + BOX_KIT_H + BOX_PADDING + itemCount * BOX_ITEM_ROW_H));
}

function BoxLabelContent({ data, items, isPreview = false }: { data: BoxFormValues; items: BoxItem[]; isPreview?: boolean }) {
  const { width } = data;
  const itemCount = Math.max(items.length, 1);
  const height = data.autoHeight ? calcBoxAutoHeight(width, itemCount) : data.height;
  const itemRowH = data.autoHeight ? BOX_ITEM_ROW_H : Math.min((height - BOX_LOGO_H - BOX_KIT_H - BOX_PADDING) / itemCount, 10);
  const itemFs = `${Math.max(9, Math.min(itemRowH * 0.85, width * 0.1))}px`;
  const kitFs = `${Math.max(16, width * 0.25)}px`;
  const phoneFs = `${Math.max(8, width * 0.09)}px`;
  const logoW = `${width * 0.55}mm`;

  const heightStyle = data.autoHeight ? { minHeight: `${height}mm` } : { height: `${height}mm` };

  return (
    <div className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, ...heightStyle, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: data.autoHeight ? 'visible' : 'hidden' }}>
      <div className="flex items-center justify-center gap-2 flex-shrink-0" style={{ height: `${BOX_LOGO_H}mm`, padding: '1.5mm 2mm' }}>
        <img src="/logo-black.png" alt="Filmværksted København" className="object-contain" style={{ maxWidth: logoW, maxHeight: '90%', filter: 'invert(1)' }} />
        <span className="font-bold tracking-wider whitespace-nowrap" style={{ fontSize: phoneFs }}>+45 71 99 33 66</span>
      </div>
      <div className="bg-white text-black text-center flex-shrink-0 px-3" style={{ height: `${BOX_KIT_H}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="font-bold uppercase tracking-wider leading-tight" style={{ fontSize: kitFs }}>{data.kitName}</div>
      </div>
      <div className="p-2">
        <div className="flex flex-col gap-0.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center px-2 rounded" style={{ fontSize: itemFs, height: `${itemRowH}mm`, borderBottom: '1px solid white' }}>
              <span className="font-bold">{item.name}</span>
              {item.id && <span className="ml-auto font-mono font-bold flex-shrink-0" style={{ fontSize: `calc(${itemFs} * 0.85)` }}>#{item.id}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function parsePdfFile(file: File): Promise<ParsedItem[]> {
  const formData = new FormData();
  formData.append("pdf", file);
  const response = await fetch("/api/parse-pdf", { method: "POST", body: formData });
  if (!response.ok) throw new Error("Server fejl");
  const data = await response.json();
  return data.items;
}

export default function LabelGenerator() {
  const { toast } = useToast();
  const [mode, setMode] = useState<LabelMode>("equipment");
  const [batchItems, setBatchItems] = useState<ParsedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewLabelRef = useRef<HTMLDivElement>(null);
  const [fontScales, setFontScales] = useState<Record<number, number>>({});

  const getFontScale = (idx: number) => fontScales[idx] ?? 1;

  const checkOverflowAt = useCallback((idx: number) => {
    const el = previewLabelRef.current;
    if (!el) return false;
    const allLabels = el.querySelectorAll('[data-label-root]');
    const labelEl = allLabels[idx] as HTMLElement;
    if (!labelEl) return false;
    if (labelEl.scrollHeight > labelEl.clientHeight + 1 ||
        labelEl.scrollWidth > labelEl.clientWidth + 1) return true;
    const contentEl = labelEl.querySelector('[data-label-content]') as HTMLElement;
    if (contentEl) {
      if (contentEl.scrollHeight > contentEl.clientHeight + 1 ||
          contentEl.scrollWidth > contentEl.clientWidth + 1) return true;
    }
    const textEls = labelEl.querySelectorAll('[data-label-name], [data-label-id], [data-label-group]');
    for (const te of textEls) {
      const t = te as HTMLElement;
      if (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) return true;
    }
    return false;
  }, []);

  const optimizeLabel = useCallback(() => {
    const el = previewLabelRef.current;
    if (!el) return;
    const count = el.querySelectorAll('[data-label-root]').length;
    if (count === 0) return;

    setFontScales({});

    const optimizeOne = (idx: number, scales: Record<number, number>) => {
      if (idx >= count) {
        setFontScales(scales);
        toast({ title: "Tekst optimeret", description: `${count} label${count > 1 ? 's' : ''} optimeret individuelt.` });
        return;
      }

      const runStep = (lo: number, hi: number, step: number, currentScales: Record<number, number>) => {
        if (step > 15 || hi - lo < 0.05) {
          const safeScale = Math.max(0.5, lo * 0.95);
          const final = { ...currentScales, [idx]: safeScale };
          setFontScales(final);
          requestAnimationFrame(() => {
            optimizeOne(idx + 1, final);
          });
          return;
        }

        const mid = Math.round(((lo + hi) / 2) * 100) / 100;
        const next = { ...currentScales, [idx]: mid };
        setFontScales(next);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const overflows = checkOverflowAt(idx);
            if (overflows) {
              runStep(lo, mid - 0.05, step + 1, currentScales);
            } else {
              runStep(mid, hi, step + 1, next);
            }
          });
        });
      };

      const initial = { ...scales, [idx]: 1 };
      setFontScales(initial);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const overflows = checkOverflowAt(idx);
          if (overflows) {
            runStep(0.5, 1.0, 0, scales);
          } else {
            runStep(1.0, 2.5, 0, initial);
          }
        });
      });
    };

    requestAnimationFrame(() => {
      optimizeOne(0, {});
    });
  }, [checkOverflowAt, toast]);

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
    group: "",
    codeType: "qr",
    width: 70,
    height: 10,
    preset: "medium",
  });

  const [boxData, setBoxData] = useState<BoxFormValues>({
    kitName: "Lys Kit 1",
    width: 100,
    height: 200,
    autoHeight: true,
  });
  const [boxItems, setBoxItems] = useState<BoxItem[]>([{ name: "Eksempel genstand" }]);
  const [newBoxItemName, setNewBoxItemName] = useState("");
  const [boxCopies, setBoxCopies] = useState(1);

  const equipmentForm = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: labelData,
  });

  const cableForm = useForm<CableFormValues>({
    resolver: zodResolver(cableSchema),
    defaultValues: cableData,
  });

  const boxForm = useForm<BoxFormValues>({
    resolver: zodResolver(boxSchema),
    defaultValues: boxData,
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
    setFontScales({});
    toast({ title: "Label opdateret", description: "Visningen er blevet opdateret." });
  };

  const onCableSubmit = (data: CableFormValues) => {
    setCableData(data);
    setFontScales({});
    toast({ title: "Kabel label opdateret", description: "Visningen er blevet opdateret." });
  };

  const onBoxSubmit = (data: BoxFormValues) => {
    setBoxData(data);
    toast({ title: "Kasse label opdateret", description: "Visningen er blevet opdateret." });
  };

  const addBoxItem = () => {
    if (newBoxItemName.trim()) {
      setBoxItems(prev => [...prev, { name: newBoxItemName.trim() }]);
      setNewBoxItemName("");
    }
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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("PDF file selected:", file.name, file.size, file.type);
    try {
      const items = await parsePdfFile(file);
      console.log("Parsed items:", items);
      if (items.length === 0) {
        toast({ title: "Ingen data fundet", description: "PDF'en indeholdt ingen genkendelige labels.", variant: "destructive" });
        return;
      }
      if (mode === "box") {
        setBoxItems(items.map(i => ({ name: i.name, id: i.id || undefined })));
        if (items[0]?.group) {
          const kitName = items[0].group;
          boxForm.setValue("kitName", kitName);
          setBoxData(prev => ({ ...prev, kitName }));
        }
        toast({ title: `${items.length} genstande indlæst`, description: "Genstande fra PDF er klar til kasse-labelen." });
      } else {
        setBatchItems(items);
        toast({ title: `${items.length} labels indlæst`, description: "Labels fra PDF er klar til forhåndsvisning og print." });
      }
    } catch (err) {
      console.error("PDF upload error:", err);
      toast({ title: "Fejl ved indlæsning", description: "Kunne ikke læse PDF-filen. Prøv en anden fil.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-8 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground" data-testid="text-title">Label Generator</h1>
            <p className="text-muted-foreground mt-2">
              Generer labels til udstyr, kabler og kasser. Klar til Zebra ZD621t.
            </p>
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".pdf" ref={fileInputRef} onChange={handlePdfUpload} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} size="lg" variant="outline" className="gap-2" data-testid="button-upload-pdf">
              <Upload className="h-5 w-5" />
              Importér PDF
            </Button>
            <Button onClick={handlePrint} size="lg" className="gap-2" data-testid="button-print">
              <Printer className="h-5 w-5" />
              {batchItems.length > 0 ? `Print ${batchItems.length} Labels` : "Print Label"}
            </Button>
          </div>
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
          <Button
            variant={mode === "box" ? "default" : "outline"}
            onClick={() => setMode("box")}
            className="gap-2"
            data-testid="button-mode-box"
          >
            <Box className="h-4 w-4" />
            Kasse Label
          </Button>
        </div>

        {batchItems.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Importerede Labels ({batchItems.length})</CardTitle>
                <CardDescription>Labels indlæst fra PDF-fil</CardDescription>
              </div>
              <Button variant="destructive" size="sm" className="gap-2" onClick={() => setBatchItems([])} data-testid="button-clear-batch">
                <Trash2 className="h-4 w-4" />
                Ryd alle
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {batchItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-muted/50 rounded text-sm" data-testid={`batch-item-${idx}`}>
                    {item.id ? <span className="font-mono text-muted-foreground">#{item.id}</span> : <span className="text-muted-foreground text-xs italic">Intet nr.</span>}
                    <span className="font-bold flex-1">{item.name}</span>
                    {item.group && <span className="text-xs bg-primary/10 px-2 py-0.5 rounded">{item.group}</span>}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBatchItems(prev => prev.filter((_, i) => i !== idx))} data-testid={`button-remove-batch-${idx}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>{mode === "equipment" ? "Udstyr Konfiguration" : mode === "cable" ? "Kabel Konfiguration" : "Kasse Konfiguration"}</CardTitle>
              <CardDescription>
                {mode === "equipment"
                  ? "Indtast oplysninger til udstyr-labelen."
                  : mode === "cable"
                  ? "Indtast oplysninger til kabel-labelen. Denne vikles rundt om kablet."
                  : "Indtast kit-navn og tilføj genstande til kasse-labelen."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "box" ? (
                <Form {...boxForm}>
                  <form onSubmit={boxForm.handleSubmit(onBoxSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Kit / Kasse Navn</label>
                      <Input
                        placeholder="F.eks. Lys Kit 1"
                        value={boxData.kitName}
                        onChange={e => {
                          const val = e.target.value;
                          setBoxData(prev => ({ ...prev, kitName: val }));
                          boxForm.setValue("kitName", val);
                        }}
                        data-testid="input-box-kit"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium leading-none">Genstande i kassen</label>
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Tilføj genstand..."
                            value={newBoxItemName}
                            onChange={e => setNewBoxItemName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBoxItem(); } }}
                            data-testid="input-box-new-item"
                          />
                          <Button type="button" variant="outline" onClick={addBoxItem} data-testid="button-add-box-item">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-1 max-h-64 overflow-y-auto">
                          {boxItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1 p-1.5 bg-muted/50 rounded text-sm" data-testid={`box-item-${idx}`}>
                              <div className="flex flex-col">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={idx === 0}
                                  onClick={() => setBoxItems(prev => {
                                    const arr = [...prev];
                                    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                    return arr;
                                  })}
                                  data-testid={`button-move-up-${idx}`}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={idx === boxItems.length - 1}
                                  onClick={() => setBoxItems(prev => {
                                    const arr = [...prev];
                                    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                    return arr;
                                  })}
                                  data-testid={`button-move-down-${idx}`}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="text-muted-foreground font-mono text-xs">{idx + 1}.</span>
                              <span className="flex-1 font-medium">{item.name}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBoxItems(prev => prev.filter((_, i) => i !== idx))} data-testid={`button-remove-box-item-${idx}`}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {boxItems.length > 0 && (
                          <Button type="button" variant="destructive" size="sm" className="gap-2" onClick={() => setBoxItems([])} data-testid="button-clear-box-items">
                            <Trash2 className="h-3 w-3" />
                            Ryd alle genstande
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium leading-none">Label Type</label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          { label: "Peli Air 1555", w: 100 },
                          { label: "CRDBAG Half", w: 100 },
                          { label: "CRDBAG Full", w: 100 },
                        ].map(preset => (
                          <Button
                            key={preset.label}
                            type="button"
                            variant={boxData.width === preset.w ? "outline" : "outline"}
                            className="text-xs"
                            onClick={() => {
                              boxForm.setValue("width", preset.w);
                              setBoxData(prev => ({ ...prev, width: preset.w }));
                            }}
                            data-testid={`button-box-preset-${preset.label.toLowerCase().replace(/\s/g, '-')}`}
                          >
                            {preset.label}<br />{preset.w}mm bred
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium leading-none">Bredde (mm)</label>
                      <div className="mt-2">
                        <Input
                          type="number"
                          value={boxData.width}
                          onChange={e => {
                            const val = Number(e.target.value);
                            boxForm.setValue("width", val);
                            setBoxData(prev => ({ ...prev, width: val }));
                          }}
                          data-testid="input-box-width"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="box-auto-height"
                        checked={boxData.autoHeight ?? true}
                        onChange={e => {
                          const checked = e.target.checked;
                          setBoxData(prev => ({ ...prev, autoHeight: checked }));
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid="checkbox-box-auto-height"
                      />
                      <label htmlFor="box-auto-height" className="text-sm font-medium leading-none cursor-pointer">
                        Tilpas højde automatisk til antal genstande
                      </label>
                    </div>
                    {!boxData.autoHeight && (
                      <div>
                        <label className="text-sm font-medium leading-none">Højde (mm)</label>
                        <div className="mt-2">
                          <Input
                            type="number"
                            value={boxData.height}
                            onChange={e => {
                              const val = Number(e.target.value);
                              boxForm.setValue("height", val);
                              setBoxData(prev => ({ ...prev, height: val }));
                            }}
                            data-testid="input-box-height"
                          />
                        </div>
                      </div>
                    )}
                    {boxData.autoHeight && boxItems.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Beregnet højde: {calcBoxAutoHeight(boxData.width, boxItems.length)}mm for {boxItems.length} genstand{boxItems.length !== 1 ? 'e' : ''}
                      </div>
                    )}
                    <Button type="submit" className="w-full" data-testid="button-update-box">Opdater Visning</Button>
                  </form>
                </Form>
              ) : mode === "equipment" ? (
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
                          <FormLabel>Gruppe / Kit (valgfri)</FormLabel>
                          <FormControl>
                            <Input placeholder="Lad stå tom for ingen gruppe" {...field} data-testid="input-cable-group" />
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
                  : mode === "cable"
                  ? "Kabel-labelen vikles rundt om kablet. Brug print-knappen for at udskrive."
                  : "Kasse-labelen viser alle genstande i kassen. Brug print-knappen for at udskrive."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-8 rounded-lg border-dashed border-2 m-6 overflow-auto gap-4">
              {mode !== "box" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 self-end"
                  onClick={optimizeLabel}
                  data-testid="button-optimize-label"
                >
                  <Wand2 className="h-4 w-4" />
                  Optimer Tekst
                </Button>
              )}
              <div ref={previewLabelRef}>
                {mode === "box" ? (
                  <BoxLabelContent data={boxData} items={boxItems} isPreview={true} />
                ) : batchItems.length > 0 ? (
                  batchItems.map((item, idx) => (
                    mode === "equipment" ? (
                      <EquipmentLabelContent
                        key={idx}
                        data={{ ...labelData, name: item.name, id: item.id, group: item.group }}
                        isPreview={true}
                        fontScale={getFontScale(idx)}
                      />
                    ) : (
                      <CableLabelContent
                        key={idx}
                        data={{ ...cableData, name: item.name, id: item.id, group: item.group }}
                        isPreview={true}
                        fontScale={getFontScale(idx)}
                      />
                    )
                  ))
                ) : mode === "equipment" ? (
                  <EquipmentLabelContent data={labelData} isPreview={true} fontScale={getFontScale(0)} />
                ) : (
                  <CableLabelContent data={cableData} isPreview={true} fontScale={getFontScale(0)} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Area */}
      <div className="hidden print:block fixed top-0 left-0">
        <style type="text/css" media="print">
          {`
            @page {
              size: 100mm auto;
              margin: 0mm;
            }
            body {
              background: white;
            }
          `}
        </style>
        {mode === "box" ? (
          Array.from({ length: boxCopies }).map((_, i) => (
            <BoxLabelContent key={i} data={boxData} items={boxItems} />
          ))
        ) : (() => {
          const printWidth = mode === "equipment" ? labelData.width : cableData.width;
          const cols = Math.max(1, Math.floor(100 / printWidth));
          const items = batchItems.length > 0
            ? batchItems.map(item => ({ name: item.name, id: item.id, group: item.group }))
            : [{ name: mode === "equipment" ? labelData.name : cableData.name, id: mode === "equipment" ? labelData.id : cableData.id, group: mode === "equipment" ? labelData.group : cableData.group }];
          const rows: typeof items[] = [];
          for (let i = 0; i < items.length; i += cols) {
            rows.push(items.slice(i, i + cols));
          }
          return rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', flexDirection: 'row', gap: '0mm' }}>
              {row.map((item, colIdx) => {
                const globalIdx = rowIdx * cols + colIdx;
                return mode === "equipment" ? (
                  <EquipmentLabelContent
                    key={`${rowIdx}-${colIdx}`}
                    data={{ ...labelData, name: item.name, id: item.id, group: item.group }}
                    fontScale={getFontScale(globalIdx)}
                  />
                ) : (
                  <CableLabelContent
                    key={`${rowIdx}-${colIdx}`}
                    data={{ ...cableData, name: item.name, id: item.id, group: item.group }}
                    fontScale={getFontScale(globalIdx)}
                  />
                );
              })}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
