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
import { RefreshCw, Printer, Tag, Cable, ArrowRightLeft, Upload, Trash2, Box, Plus, Wand2, ChevronUp, ChevronDown, Circle, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LabelMode = "equipment" | "cable" | "box" | "round";

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
  kitNumber: z.string().optional(),
  width: z.number().min(50, "Minimum bredde er 50mm").max(200, "Maksimum bredde er 200mm"),
  height: z.number().min(20, "Minimum højde er 20mm").max(600, "Maksimum højde er 600mm"),
  autoHeight: z.boolean().optional(),
});


type EquipmentFormValues = z.infer<typeof equipmentSchema>;
type CableFormValues = z.infer<typeof cableSchema>;
type BoxFormValues = z.infer<typeof boxSchema>;
type RoundFormValues = {
  name: string;
  id: string;
  group: string;
  width?: number;
  height?: number;
  codeType: "qr" | "none";
};

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

type LabelElement = 'name' | 'id' | 'group';

// Design A: Top bar with company info, QR left, text right (horizontal)
function EquipmentLabelDesignA({ data, isPreview = false, fontScale = 1, elementOrder = ['name', 'id', 'group'], spacing = 50, showQrOverride }: { data: EquipmentFormValues; isPreview?: boolean; fontScale?: number; elementOrder?: LabelElement[]; spacing?: number; showQrOverride?: boolean }) {
  const { width, height } = data;
  const s = fontScale;
  const isSmall = height < 15;
  const isNarrow = width < 20;
  const isTiny = isSmall || isNarrow;
  const showQr = showQrOverride !== undefined ? (showQrOverride && data.id && !isTiny) : (data.id && !isTiny);

  const isCompact = !isTiny && height < 30;
  const contentH = isSmall ? height * 0.78 : height * 0.82;
  const namePx = (isSmall
    ? Math.max(8, Math.min(width * 0.16, contentH * 0.32))
    : Math.max(8, Math.min(width, height) * 0.15)) * s;
  const idPx = (isSmall
    ? Math.max(8, Math.min(width * 0.24, contentH * 0.5))
    : Math.max(10, Math.min(width, height) * 0.28)) * s;
  const groupPx = (isSmall
    ? Math.max(5, Math.min(width * 0.1, contentH * 0.22))
    : Math.max(6, Math.min(width, height) * 0.12)) * s;
  const groupFs = `${groupPx}px`;
  const nameFs = `${namePx}px`;
  const idFs = `${idPx}px`;
  const infoFs = `${Math.max(6, Math.min(width * 0.12, height * 0.22))}px`;
  const barH = isSmall ? `${Math.max(height * 0.25, 3)}mm` : isCompact ? `${Math.max(height * 0.22, 4)}mm` : `${Math.max(height * 0.24, 7)}mm`;
  const isLarge = width >= 40 && height >= 40;
  const qrSize = Math.min(width * 0.42, height * 0.55);
  const logoH = `${Math.max(7, height * 0.17)}px`;
  const padV = isTiny ? '1.5mm' : isCompact ? '0.3mm' : isLarge ? `${height * 0.08}mm` : '0.5rem';
  const padH = isTiny ? '1mm' : isCompact ? '1mm' : isLarge ? `${width * 0.06}mm` : '0.5rem';
  const contentGap = isTiny ? '2px' : isCompact ? '1.5mm' : isLarge ? `${width * 0.03}mm` : '0.5rem';

  // At 10mm and below: strip layout — QR | name (top) + id (bottom) | company info
  if (isSmall) {
    const stripQrSize = height * 0.82;
    const stripIdPx = Math.max(6, Math.min(width * 0.18, height * 0.38)) * s;
    const stripNamePx = Math.max(5, Math.min(width * 0.13, height * 0.3)) * s;
    const infoFs = Math.max(5, height * 0.22);
    return (
      <div data-label-root className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
        <div className="flex flex-row items-stretch w-full h-full" style={{ padding: '0.4mm 0 0.4mm 1mm', gap: '1.5mm' }}>
          {data.id && (
            <div className="flex-shrink-0 bg-white self-center" style={{ width: `${stripQrSize}mm`, height: `${stripQrSize}mm`, padding: `${stripQrSize * 0.03}mm` }}>
              <QRCode value={data.id} style={{ height: "100%", width: "100%", display: "block" }} viewBox="0 0 256 256" />
            </div>
          )}
          <span className="w-px bg-white flex-shrink-0 self-stretch opacity-60" />
          <div className="flex flex-col justify-center flex-1 min-w-0" style={{ gap: '1px' }}>
            {data.name && <span className="font-bold uppercase truncate" data-label-name style={{ fontSize: `${stripNamePx}px`, lineHeight: 1.05 }}>{data.name}</span>}
            {data.id && <span className="font-mono font-bold tracking-wider truncate" data-label-id style={{ fontSize: `${stripIdPx}px`, lineHeight: 1.05 }}>#{data.id}</span>}
          </div>
          <div className="bg-white text-black flex flex-col items-end flex-shrink-0 justify-center self-stretch" style={{ padding: '0 1.5mm', gap: '0.5px' }}>
            <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: `${infoFs}px`, lineHeight: 1.1 }}>Filmværksted København</span>
            <span className="font-bold whitespace-nowrap" style={{ fontSize: `${infoFs}px`, lineHeight: 1.1 }}>+45 71 99 33 66</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-label-root className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
      <div className="bg-white text-black flex items-center justify-center w-full flex-shrink-0" style={{ height: barH, maxHeight: barH, minHeight: 0, overflow: 'hidden', paddingLeft: `${width * 0.04}mm`, paddingRight: `${width * 0.04}mm`, flexDirection: width < 40 ? 'column' : 'row', gap: width < 40 ? '0' : '6px' }}>
        <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>Filmværksted København</span>
        {width >= 40 && <span className="opacity-40 flex-shrink-0" style={{ fontSize: infoFs }}>|</span>}
        <span className="font-bold tracking-wider whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>+45 71 99 33 66</span>
      </div>
      <div data-label-content className="flex-1 flex items-stretch min-h-0" style={{ paddingTop: padV, paddingBottom: padV, paddingLeft: padH, paddingRight: padH }}>
        <div className="flex flex-row items-center h-full w-full" style={{ gap: contentGap }}>
          {showQr && (
            <>
              <div className="flex items-center justify-center flex-shrink-0 bg-white" style={{ width: `${qrSize}mm`, height: `${qrSize}mm`, padding: `${qrSize * 0.03}mm`, flexShrink: 0 }}>
                <QRCode value={data.id} style={{ height: "100%", width: "100%", maxWidth: "100%", display: "block" }} viewBox="0 0 256 256" />
              </div>
              <div className="w-[2px] bg-white flex-shrink-0" style={{ height: `${qrSize * 0.8}mm`, alignSelf: 'center' }}></div>
            </>
          )}
          <div className="flex flex-col justify-center self-stretch min-w-0 flex-1 text-left" style={{ overflow: 'hidden', gap: isCompact ? '1px' : `${Math.max(1, spacing * 0.15)}px` }}>
            {elementOrder.map((el) => {
              if (el === 'name') return <div key="name" className="font-bold uppercase leading-tight" data-label-name style={{ fontSize: nameFs, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.1 }}>{data.name}</div>;
              if (el === 'id' && data.id) return <div key="id" className="font-mono tracking-wider font-bold" data-label-id style={{ fontSize: idFs, wordBreak: 'break-all', overflowWrap: 'break-word', lineHeight: 1.05 }}>#{data.id}</div>;
              if (el === 'group' && data.group) return <div key="group"><span className="bg-white text-black font-bold uppercase tracking-wider rounded inline-block" data-label-group style={{ fontSize: groupFs, padding: isCompact ? '1px 4px' : '2px 8px', lineHeight: 1.1 }}>{data.group}</span></div>;
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Design B: QR left, Navn øverst, Gruppe i midten, ID nederst
function EquipmentLabelDesignB({ data, isPreview = false, fontScale = 1 }: { data: EquipmentFormValues; isPreview?: boolean; fontScale?: number }) {
  const { width, height } = data;
  const s = fontScale;
  const isSmall = height < 15;
  const isNarrow = width < 20;
  const isTiny = isSmall || isNarrow;
  const showQr = data.id && !isTiny;
  const contentH = isSmall ? height * 0.78 : height * 0.82;
  const namePx = (isSmall ? Math.max(8, Math.min(width * 0.22, contentH * 0.45)) : Math.max(8, Math.min(width, height) * 0.22)) * s;
  const idPx = (isSmall ? Math.max(6, Math.min(width * 0.16, contentH * 0.35)) : Math.max(8, Math.min(width, height) * 0.19)) * s;
  const groupPx = (isSmall ? Math.max(5, Math.min(width * 0.1, contentH * 0.22)) : Math.max(6, Math.min(width, height) * 0.12)) * s;
  const infoFs = `${Math.max(6, Math.min(width * 0.12, height * 0.22))}px`;
  const barH = isSmall ? `${Math.max(height * 0.25, 3)}mm` : `${Math.max(height * 0.24, 7)}mm`;
  const isLarge = width >= 40 && height >= 40;
  const qrSize = Math.min(width * 0.3, height * 0.5);
  const logoH = `${Math.max(7, height * 0.17)}px`;
  const padV = isTiny ? '1.5mm' : isLarge ? `${height * 0.08}mm` : '0.5rem';
  const padH = isTiny ? '1mm' : isLarge ? `${width * 0.06}mm` : '0.5rem';
  const contentGap = isTiny ? '2px' : isLarge ? `${width * 0.04}mm` : '0.75rem';

  return (
    <div data-label-root className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
      <div className="bg-white text-black flex items-center justify-center w-full flex-shrink-0" style={{ height: barH, maxHeight: barH, minHeight: 0, overflow: 'hidden', paddingLeft: `${width * 0.04}mm`, paddingRight: `${width * 0.04}mm`, flexDirection: width < 40 ? 'column' : 'row', gap: width < 40 ? '0' : '6px' }}>
        <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>Filmværksted København</span>
        {width >= 40 && <span className="opacity-40 flex-shrink-0" style={{ fontSize: infoFs }}>|</span>}
        <span className="font-bold tracking-wider whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>+45 71 99 33 66</span>
      </div>
      <div data-label-content className="flex-1 flex items-center justify-center min-h-0" style={{ paddingTop: padV, paddingBottom: padV, paddingLeft: padH, paddingRight: padH }}>
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
            <div className="font-bold uppercase leading-none" data-label-name style={{ fontSize: `${namePx}px`, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.1 }}>{data.name}</div>
            {data.group && (
              <div>
                <span className="bg-white text-black font-bold uppercase tracking-wider rounded inline-block" data-label-group style={{ fontSize: `${groupPx}px`, padding: isTiny ? '0px 2px' : '2px 8px', lineHeight: 1.15 }}>{data.group}</span>
              </div>
            )}
            {data.id && (
              <div className="font-mono tracking-wider" data-label-id style={{ fontSize: `${idPx}px`, wordBreak: 'break-all', overflowWrap: 'break-word', lineHeight: 1.1 }}>#{data.id}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Design C: QR left, Navn og ID tæt sammen øverst, Gruppe nederst med afstand
function EquipmentLabelDesignC({ data, isPreview = false, fontScale = 1 }: { data: EquipmentFormValues; isPreview?: boolean; fontScale?: number }) {
  const { width, height } = data;
  const s = fontScale;
  const isSmall = height < 15;
  const isNarrow = width < 20;
  const isTiny = isSmall || isNarrow;
  const showQr = data.id && !isTiny;
  const contentH = isSmall ? height * 0.78 : height * 0.82;
  const namePx = (isSmall ? Math.max(8, Math.min(width * 0.22, contentH * 0.45)) : Math.max(8, Math.min(width, height) * 0.22)) * s;
  const idPx = (isSmall ? Math.max(6, Math.min(width * 0.16, contentH * 0.35)) : Math.max(8, Math.min(width, height) * 0.19)) * s;
  const groupPx = (isSmall ? Math.max(5, Math.min(width * 0.1, contentH * 0.22)) : Math.max(6, Math.min(width, height) * 0.12)) * s;
  const infoFs = `${Math.max(6, Math.min(width * 0.12, height * 0.22))}px`;
  const barH = isSmall ? `${Math.max(height * 0.25, 3)}mm` : `${Math.max(height * 0.24, 7)}mm`;
  const isLarge = width >= 40 && height >= 40;
  const qrSize = Math.min(width * 0.3, height * 0.5);
  const logoH = `${Math.max(7, height * 0.17)}px`;
  const padV = isTiny ? '1.5mm' : isLarge ? `${height * 0.08}mm` : '0.5rem';
  const padH = isTiny ? '1mm' : isLarge ? `${width * 0.06}mm` : '0.5rem';
  const contentGap = isTiny ? '2px' : isLarge ? `${width * 0.04}mm` : '0.75rem';

  return (
    <div data-label-root className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
      <div className="bg-white text-black flex items-center justify-center w-full flex-shrink-0" style={{ height: barH, maxHeight: barH, minHeight: 0, overflow: 'hidden', paddingLeft: `${width * 0.04}mm`, paddingRight: `${width * 0.04}mm`, flexDirection: width < 40 ? 'column' : 'row', gap: width < 40 ? '0' : '6px' }}>
        <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>Filmværksted København</span>
        {width >= 40 && <span className="opacity-40 flex-shrink-0" style={{ fontSize: infoFs }}>|</span>}
        <span className="font-bold tracking-wider whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>+45 71 99 33 66</span>
      </div>
      <div data-label-content className="flex-1 flex items-center justify-center min-h-0" style={{ paddingTop: padV, paddingBottom: padV, paddingLeft: padH, paddingRight: padH }}>
        <div className="flex flex-row items-center h-full max-w-full" style={{ gap: contentGap }}>
          {showQr && (
            <>
              <div className="flex items-center justify-center flex-shrink-0 bg-white p-0.5 rounded" style={{ width: `${qrSize}mm`, height: `${qrSize}mm` }}>
                <QRCode value={data.id} style={{ height: "100%", width: "100%", maxWidth: "100%", objectFit: "contain" }} viewBox="0 0 256 256" />
              </div>
              <div className="h-[70%] w-[2px] bg-white rounded-full flex-shrink-0"></div>
            </>
          )}
          <div className="flex flex-col items-center min-w-0 w-full text-center" style={{ overflow: 'hidden', justifyContent: 'space-between', height: '100%' }}>
            <div className="flex flex-col items-center" style={{ marginTop: isTiny ? '1px' : '4px' }}>
              <div className="font-bold uppercase leading-none" data-label-name style={{ fontSize: `${namePx}px`, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.1 }}>{data.name}</div>
              {data.id && (
                <div className="font-mono tracking-wider" data-label-id style={{ fontSize: `${idPx}px`, wordBreak: 'break-all', overflowWrap: 'break-word', lineHeight: 1.1, marginTop: isTiny ? '1px' : '3px' }}>#{data.id}</div>
              )}
            </div>
            {data.group && (
              <div style={{ marginBottom: isTiny ? '1px' : '4px' }}>
                <span className="bg-white text-black font-bold uppercase tracking-wider rounded inline-block" data-label-group style={{ fontSize: `${groupPx}px`, padding: isTiny ? '0px 2px' : '2px 8px', lineHeight: 1.15 }}>{data.group}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Design D: QR left, ID stort øverst, Navn i midten, Gruppe nederst
function EquipmentLabelDesignD({ data, isPreview = false, fontScale = 1 }: { data: EquipmentFormValues; isPreview?: boolean; fontScale?: number }) {
  const { width, height } = data;
  const s = fontScale;
  const isSmall = height < 15;
  const isNarrow = width < 20;
  const isTiny = isSmall || isNarrow;
  const showQr = data.id && !isTiny;
  const contentH = isSmall ? height * 0.78 : height * 0.82;
  const namePx = (isSmall ? Math.max(8, Math.min(width * 0.18, contentH * 0.38)) : Math.max(8, Math.min(width, height) * 0.18)) * s;
  const idPx = (isSmall ? Math.max(6, Math.min(width * 0.22, contentH * 0.45)) : Math.max(8, Math.min(width, height) * 0.24)) * s;
  const groupPx = (isSmall ? Math.max(5, Math.min(width * 0.1, contentH * 0.22)) : Math.max(6, Math.min(width, height) * 0.12)) * s;
  const infoFs = `${Math.max(6, Math.min(width * 0.12, height * 0.22))}px`;
  const barH = isSmall ? `${Math.max(height * 0.25, 3)}mm` : `${Math.max(height * 0.24, 7)}mm`;
  const isLarge = width >= 40 && height >= 40;
  const qrSize = Math.min(width * 0.3, height * 0.5);
  const logoH = `${Math.max(7, height * 0.17)}px`;
  const padV = isTiny ? '1.5mm' : isLarge ? `${height * 0.08}mm` : '0.5rem';
  const padH = isTiny ? '1mm' : isLarge ? `${width * 0.06}mm` : '0.5rem';
  const contentGap = isTiny ? '2px' : isLarge ? `${width * 0.04}mm` : '0.75rem';

  return (
    <div data-label-root className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
      <div className="bg-white text-black flex items-center justify-center w-full flex-shrink-0" style={{ height: barH, maxHeight: barH, minHeight: 0, overflow: 'hidden', paddingLeft: `${width * 0.04}mm`, paddingRight: `${width * 0.04}mm`, flexDirection: width < 40 ? 'column' : 'row', gap: width < 40 ? '0' : '6px' }}>
        <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>Filmværksted København</span>
        {width >= 40 && <span className="opacity-40 flex-shrink-0" style={{ fontSize: infoFs }}>|</span>}
        <span className="font-bold tracking-wider whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>+45 71 99 33 66</span>
      </div>
      <div data-label-content className="flex-1 flex items-center justify-center min-h-0" style={{ paddingTop: padV, paddingBottom: padV, paddingLeft: padH, paddingRight: padH }}>
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
            {data.id && (
              <div className="font-mono tracking-wider font-bold" data-label-id style={{ fontSize: `${idPx}px`, wordBreak: 'break-all', overflowWrap: 'break-word', lineHeight: 1.1 }}>#{data.id}</div>
            )}
            <div className="uppercase leading-none" data-label-name style={{ fontSize: `${namePx}px`, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.1 }}>{data.name}</div>
            {data.group && (
              <div>
                <span className="bg-white text-black font-bold uppercase tracking-wider rounded inline-block" data-label-group style={{ fontSize: `${groupPx}px`, padding: isTiny ? '0px 2px' : '2px 8px', lineHeight: 1.15 }}>{data.group}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const equipmentDesigns = ['A', 'B', 'C', 'D'] as const;
type EquipmentDesign = typeof equipmentDesigns[number];
const designLabels: Record<EquipmentDesign, string> = {
  A: 'Navn → ID → Gruppe',
  B: 'Navn → Gruppe → ID',
  C: 'Navn+ID samlet øverst, Gruppe nederst',
  D: 'ID øverst → Navn → Gruppe',
};

function EquipmentLabelByDesign({ design, data, isPreview = false, fontScale = 1 }: { design: EquipmentDesign; data: EquipmentFormValues; isPreview?: boolean; fontScale?: number }) {
  switch (design) {
    case 'A': return <EquipmentLabelDesignA data={data} isPreview={isPreview} fontScale={fontScale} />;
    case 'B': return <EquipmentLabelDesignB data={data} isPreview={isPreview} fontScale={fontScale} />;
    case 'C': return <EquipmentLabelDesignC data={data} isPreview={isPreview} fontScale={fontScale} />;
    case 'D': return <EquipmentLabelDesignD data={data} isPreview={isPreview} fontScale={fontScale} />;
  }
}

function EquipmentLabelContent({ data, isPreview = false, fontScale = 1, elementOrder = ['name', 'id', 'group'], spacing = 50, showQrOverride }: { data: EquipmentFormValues; isPreview?: boolean; fontScale?: number; elementOrder?: LabelElement[]; spacing?: number; showQrOverride?: boolean }) {
  return <EquipmentLabelDesignA data={data} isPreview={isPreview} fontScale={fontScale} elementOrder={elementOrder} spacing={spacing} showQrOverride={showQrOverride} />;
}

// Cable Label Component - narrow strip that wraps around a cable
function CableLabelContent({ data, isPreview = false, fontScale = 1 }: { data: CableFormValues; isPreview?: boolean; fontScale?: number }) {
  const width = data.width;
  const height = data.height;
  const s = fontScale;

  const hasCode = data.codeType !== "none";
  const codeSize = height * 0.82;

  // Narrow = 2 per row or small preset (width < 60mm)
  const isNarrow = width < 60;

  const namePx = Math.max(5, height * 0.38) * s;
  const idPx = Math.max(6, height * 0.48) * s;
  const groupPx = Math.max(5, height * 0.32) * s;
  const infoNamePx = Math.max(4, isNarrow ? height * 0.3 : height * 0.28);
  const infoPhonePx = Math.max(4, isNarrow ? height * 0.26 : height * 0.24);
  // Narrow company section: smaller and uses abbreviation
  const companySectionW = isNarrow ? Math.max(12, width * 0.22) : Math.max(20, width * 0.3);

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
      {/* Left black section with company info */}
      <div
        className="bg-black text-white flex items-center justify-center flex-shrink-0"
        style={{ width: `${companySectionW}mm`, padding: '0 1mm' }}
      >
        <div className="flex flex-col items-center leading-none" style={{ gap: '0.5px' }}>
          <span className="font-bold whitespace-nowrap uppercase" style={{ fontSize: `${infoNamePx}px` }}>
            {isNarrow ? 'FVKBH' : 'Filmværksted København'}
          </span>
          <span className="font-bold whitespace-nowrap" style={{ fontSize: `${infoPhonePx}px` }}>
            +45 71 99 33 66
          </span>
        </div>
      </div>

      {hasCode && data.id && (
        <div className="flex items-center justify-center flex-shrink-0 bg-white" style={{ padding: '0.5mm' }}>
          {data.codeType === "qr" ? (
            <QRCode
              value={data.id}
              style={{ height: `${codeSize}mm`, width: `${codeSize}mm`, display: 'block' }}
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

      {/* Main content — name stacked above ID */}
      <div data-label-content className="flex-1 flex flex-col justify-center min-w-0 px-1" style={{ overflow: 'hidden', gap: '1px' }}>
        {data.name && (
          <span className="font-bold uppercase truncate" data-label-name style={{ fontSize: `${namePx}px`, lineHeight: 1.05 }}>
            {data.name}
          </span>
        )}
        <div className="flex items-center gap-1 min-w-0">
          {data.id && (
            <span className="font-mono font-bold truncate" data-label-id style={{ fontSize: `${idPx}px`, lineHeight: 1.05 }}>
              {data.id}
            </span>
          )}
          {data.group && (
            <span className="bg-black text-white font-bold uppercase flex-shrink-0" style={{ fontSize: `${groupPx}px`, padding: '0px 2px', lineHeight: 1.1 }}>
              {data.group}
            </span>
          )}
        </div>
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
  const hasNumber = !!(data.kitNumber && data.kitNumber.trim());
  // Taller white bar when number is present to fit QR
  const KIT_BAR_H = hasNumber ? 22 : BOX_KIT_H;
  const itemCount = Math.max(items.length, 1);
  const height = data.autoHeight ? calcBoxAutoHeight(width, itemCount) + (hasNumber ? KIT_BAR_H - BOX_KIT_H : 0) : data.height;
  const itemRowH = data.autoHeight ? BOX_ITEM_ROW_H : Math.min((height - BOX_LOGO_H - KIT_BAR_H - BOX_PADDING) / itemCount, 10);
  const itemFs = `${Math.max(9, Math.min(itemRowH * 0.85, width * 0.1))}px`;
  const kitFs = `${Math.max(14, width * 0.2)}px`;
  const phoneFs = `${Math.max(8, width * 0.09)}px`;
  const logoW = `${width * 0.55}mm`;
  const qrSize = KIT_BAR_H * 0.72;
  const kitNumFs = `${Math.max(18, width * 0.22)}px`;
  const kitNrLabelFs = `${Math.max(6, width * 0.065)}px`;

  const heightStyle = data.autoHeight ? { minHeight: `${height}mm` } : { height: `${height}mm` };

  return (
    <div className="bg-black text-white relative flex flex-col border-0" style={{ width: `${width}mm`, ...heightStyle, boxSizing: "border-box", pageBreakInside: "avoid", border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: data.autoHeight ? 'visible' : 'hidden' }}>
      <div className="flex items-center justify-center gap-2 flex-shrink-0" style={{ height: `${BOX_LOGO_H}mm`, padding: '1.5mm 2mm' }}>
        <img src="/logo-black.png" alt="Filmværksted København" className="object-contain" style={{ maxWidth: logoW, maxHeight: '90%', filter: 'invert(1)' }} />
        <span className="font-bold tracking-wider whitespace-nowrap" style={{ fontSize: phoneFs }}>+45 71 99 33 66</span>
      </div>
      {/* White bar: kit name left, QR + number right */}
      <div className="bg-white text-black flex-shrink-0 flex flex-row items-center" style={{ height: `${KIT_BAR_H}mm`, padding: '1.5mm 3mm', gap: '3mm' }}>
        <div className="font-bold uppercase tracking-wider leading-tight flex-1 min-w-0" style={{ fontSize: kitFs }}>{data.kitName}</div>
        {hasNumber && (
          <>
            <div className="w-px bg-gray-300 self-stretch flex-shrink-0" />
            <div className="flex flex-row items-center flex-shrink-0" style={{ gap: '2mm' }}>
              <div className="bg-black flex-shrink-0" style={{ width: `${qrSize}mm`, height: `${qrSize}mm`, padding: `${qrSize * 0.04}mm` }}>
                <QRCode value={data.kitNumber!} style={{ height: '100%', width: '100%', display: 'block' }} viewBox="0 0 256 256" bgColor="#000000" fgColor="#ffffff" />
              </div>
              <div className="flex flex-col items-start justify-center flex-shrink-0" style={{ gap: '0.5mm' }}>
                <span className="font-bold uppercase tracking-widest text-gray-500" style={{ fontSize: kitNrLabelFs }}>Kit nr.</span>
                <span className="font-mono font-bold leading-none" style={{ fontSize: kitNumFs }}>{data.kitNumber}</span>
              </div>
            </div>
          </>
        )}
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

// Square/Custom Label Component
function RoundLabelContent({ data, isPreview = false, nameFontSize = 0, idFontSize = 0, groupFontSize = 0, contentOffset = 0, showName = true, showId = true, showGroup = true, lineGap = 0 }: {
  data: RoundFormValues;
  isPreview?: boolean;
  nameFontSize?: number;
  idFontSize?: number;
  groupFontSize?: number;
  contentOffset?: number;
  showName?: boolean;
  showId?: boolean;
  showGroup?: boolean;
  lineGap?: number;
}) {
  const width = data.width ?? 96;
  const height = data.height ?? 40;
  const isSmall = height < 15;
  const showQr = data.codeType === 'qr' && data.id;
  const qrSize = Math.min(width * 0.42, height * 0.65);
  const barH = isSmall ? `${Math.max(height * 0.25, 3)}mm` : `${Math.max(height * 0.24, 7)}mm`;
  const infoFs = `${Math.max(6, Math.min(width * 0.12, height * 0.22))}px`;
  const autoNamePx = isSmall ? Math.max(8, Math.min(width * 0.16, height * 0.32)) : Math.max(8, Math.min(width, height) * 0.15);
  const autoIdPx = isSmall ? Math.max(8, Math.min(width * 0.24, height * 0.5)) : Math.max(10, Math.min(width, height) * 0.28);
  const autoGroupPx = isSmall ? Math.max(5, Math.min(width * 0.1, height * 0.22)) : Math.max(6, Math.min(width, height) * 0.12);
  const namePx = nameFontSize > 0 ? nameFontSize : autoNamePx;
  const idPx = idFontSize > 0 ? idFontSize : autoIdPx;
  const groupPx = groupFontSize > 0 ? groupFontSize : autoGroupPx;
  const isNarrow = width < 60;
  const padV = '0.5rem';
  const padH = '0.5rem';
  const contentGap = '0.5rem';

  // Strip layout for small labels (<15mm): QR | name/id stacked | company info
  if (isSmall) {
    const stripQrSize = height * 0.82;
    const stripNamePx = Math.max(5, Math.min(width * 0.13, height * 0.3));
    const stripIdPx = Math.max(6, Math.min(width * 0.18, height * 0.38));
    const stripInfoFs = Math.max(5, height * 0.22);
    return (
      <div data-label-root className="bg-black text-white relative flex flex-col border-0"
        style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: 'border-box', pageBreakInside: 'avoid', border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
        <div className="flex flex-row items-stretch w-full h-full" style={{ padding: '0.4mm 0 0.4mm 1mm', gap: '1.5mm' }}>
          {showQr && data.id && (
            <div className="flex-shrink-0 bg-white self-center" style={{ width: `${stripQrSize}mm`, height: `${stripQrSize}mm`, padding: `${stripQrSize * 0.03}mm` }}>
              <QRCode value={data.id} style={{ height: '100%', width: '100%', display: 'block' }} viewBox="0 0 256 256" />
            </div>
          )}
          <span className="w-px bg-white flex-shrink-0 self-stretch opacity-60" />
          <div className="flex flex-col justify-center flex-1 min-w-0" style={{ gap: '1px' }}>
            {showName && data.name && <span className="font-bold uppercase truncate" data-label-name style={{ fontSize: `${stripNamePx}px`, lineHeight: 1.05 }}>{data.name}</span>}
            {showId && data.id && <span className="font-mono font-bold truncate" data-label-id style={{ fontSize: `${stripIdPx}px`, lineHeight: 1.05 }}>#{data.id}</span>}
          </div>
          <div className="bg-white text-black flex flex-col items-end flex-shrink-0 justify-center self-stretch" style={{ padding: '0 1.5mm', gap: '0.5px' }}>
            <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: `${stripInfoFs}px`, lineHeight: 1.1 }}>{isNarrow ? 'FVKBH' : 'Filmværksted København'}</span>
            <span className="font-bold whitespace-nowrap" style={{ fontSize: `${stripInfoFs}px`, lineHeight: 1.1 }}>+45 71 99 33 66</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-label-root className="bg-black text-white relative flex flex-col border-0"
      style={{ width: `${width}mm`, height: `${height}mm`, boxSizing: 'border-box', pageBreakInside: 'avoid', border: isPreview ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
      {/* Header bar */}
      <div className="bg-white text-black flex items-center justify-center w-full flex-shrink-0"
        style={{ height: barH, maxHeight: barH, minHeight: 0, overflow: 'hidden', paddingLeft: `${width * 0.04}mm`, paddingRight: `${width * 0.04}mm`, flexDirection: width < 40 ? 'column' : 'row', gap: width < 40 ? '0' : '6px' }}>
        <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>Filmværksted København</span>
        {width >= 40 && <span className="opacity-40 flex-shrink-0" style={{ fontSize: infoFs }}>|</span>}
        <span className="font-bold tracking-wider whitespace-nowrap" style={{ fontSize: infoFs, lineHeight: 1.1 }}>+45 71 99 33 66</span>
      </div>
      {/* Content */}
      <div data-label-content className="flex-1 flex items-stretch min-h-0"
        style={{ paddingTop: padV, paddingBottom: padV, paddingLeft: padH, paddingRight: padH, transform: contentOffset !== 0 ? `translateY(${contentOffset}mm)` : undefined }}>
        <div className="flex flex-row items-center h-full w-full" style={{ gap: contentGap }}>
          {showQr && (
            <>
              <div className="flex items-center justify-center flex-shrink-0 bg-white rounded"
                style={{ width: `${qrSize}mm`, height: `${qrSize}mm`, padding: `${qrSize * 0.03}mm` }}>
                <QRCode value={data.id} style={{ height: '100%', width: '100%', maxWidth: '100%' }} viewBox="0 0 256 256" />
              </div>
              <div className="w-[2px] bg-white flex-shrink-0" style={{ height: `${qrSize * 0.8}mm`, alignSelf: 'center' }}></div>
            </>
          )}
          <div className="flex flex-col justify-center self-stretch min-w-0 flex-1 text-left" style={{ overflow: 'hidden', gap: lineGap > 0 ? `${lineGap}mm` : contentGap }}>
            {showName && <div className="font-bold uppercase leading-tight" data-label-name
              style={{ fontSize: `${namePx}px`, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.15 }}>{data.name}</div>}
            {showId && data.id && <div className="font-mono tracking-wider font-bold" data-label-id
              style={{ fontSize: `${idPx}px`, wordBreak: 'break-all', lineHeight: 1.1 }}>#{data.id}</div>}
            {showGroup && data.group && <div><span className="bg-white text-black font-bold uppercase tracking-wider rounded inline-block" data-label-group
              style={{ fontSize: `${groupPx}px`, padding: '2px 8px', lineHeight: 1.15 }}>{data.group}</span></div>}
          </div>
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
  const [printerWidth] = useState<number>(96);
  const [labelsPerRow, setLabelsPerRow] = useState<number>(() => {
    return Number(localStorage.getItem("labelsPerRow")) || 1;
  });
  const labelWidth = Math.floor(printerWidth / labelsPerRow); // 105, 52, or 35
  const [mode, setMode] = useState<LabelMode>("equipment");
  const [batchItems, setBatchItems] = useState<ParsedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewLabelRef = useRef<HTMLDivElement>(null);
  const [fontScales, setFontScales] = useState<Record<number, number>>({});
  const [elementOrder, setElementOrder] = useState<LabelElement[]>(['name', 'id', 'group']);
  const showQrCode = true;
  const [labelSpacing, setLabelSpacing] = useState(50);

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
    kitNumber: "",
    width: 100,
    height: 200,
    autoHeight: true,
  });
  const [boxItems, setBoxItems] = useState<BoxItem[]>([{ name: "Eksempel genstand" }]);
  const [newBoxItemName, setNewBoxItemName] = useState("");
  const [boxCopies, setBoxCopies] = useState(1);
  const [labelCopies, setLabelCopies] = useState(1);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number | null>(null);

  const [roundData, setRoundData] = useState<RoundFormValues>({
    name: "Kamera 1",
    id: "CAM-001",
    group: "Kit 1",
    width: 96,
    height: 40,
    codeType: "qr",
  });
  const [roundNameSize, setRoundNameSize] = useState<number>(0);
  const [roundIdSize, setRoundIdSize] = useState<number>(0);
  const [roundGroupSize, setRoundGroupSize] = useState<number>(0);
  const [roundContentOffset, setRoundContentOffset] = useState<number>(0);
  const [roundLineGap, setRoundLineGap] = useState<number>(0);
  const [roundShowQr, setRoundShowQr] = useState<boolean>(true);
  const [roundShowName, setRoundShowName] = useState<boolean>(true);
  const [roundShowId, setRoundShowId] = useState<boolean>(true);
  const [roundShowGroup, setRoundShowGroup] = useState<boolean>(true);

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

  const [roundName, setRoundName] = useState(roundData.name);
  const [roundId, setRoundId] = useState(roundData.id);
  const [roundGroup, setRoundGroup] = useState(roundData.group ?? "");
  const [roundHeight, setRoundHeight] = useState(roundData.height ?? 40);

  const watchEquipmentPreset = equipmentForm.watch("preset");
  const watchCablePreset = cableForm.watch("preset");
  const watchEqName = equipmentForm.watch("name");
  const watchEqId = equipmentForm.watch("id");
  const watchEqGroup = equipmentForm.watch("group");
  const watchCableName = cableForm.watch("name");
  const watchCableId = cableForm.watch("id");
  const watchCableGroup = cableForm.watch("group");

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

  // Form → list: sync equipment form to selected batch item in real-time
  useEffect(() => {
    if (selectedBatchIdx !== null && mode === "equipment") {
      setBatchItems(prev => prev.map((it, i) => i === selectedBatchIdx
        ? { ...it, name: watchEqName ?? '', id: watchEqId ?? '', group: watchEqGroup ?? '' }
        : it));
    }
  }, [watchEqName, watchEqId, watchEqGroup]);

  // Form → list: sync cable form to selected batch item in real-time
  useEffect(() => {
    if (selectedBatchIdx !== null && mode === "cable") {
      setBatchItems(prev => prev.map((it, i) => i === selectedBatchIdx
        ? { ...it, name: watchCableName ?? '', id: watchCableId ?? '', group: watchCableGroup ?? '' }
        : it));
    }
  }, [watchCableName, watchCableId, watchCableGroup]);

  // Form → list: sync round state to selected batch item in real-time
  useEffect(() => {
    if (selectedBatchIdx !== null && mode === "round") {
      setBatchItems(prev => prev.map((it, i) => i === selectedBatchIdx
        ? { ...it, name: roundName, id: roundId, group: roundGroup }
        : it));
    }
  }, [roundName, roundId, roundGroup]);

  const selectBatchItem = (idx: number) => {
    const item = batchItems[idx];
    setSelectedBatchIdx(idx);
    if (mode === "equipment") {
      equipmentForm.setValue("name", item.name);
      equipmentForm.setValue("id", item.id);
      equipmentForm.setValue("group", item.group ?? "");
    } else if (mode === "cable") {
      cableForm.setValue("name", item.name);
      cableForm.setValue("id", item.id);
      cableForm.setValue("group", item.group ?? "");
    } else if (mode === "round") {
      setRoundName(item.name);
      setRoundId(item.id);
      setRoundGroup(item.group ?? "");
    }
  };

  const onEquipmentSubmit = (data: EquipmentFormValues) => {
    setLabelData(data);
    setFontScales({});
    if (selectedBatchIdx !== null) {
      setBatchItems(prev => prev.map((it, i) => i === selectedBatchIdx ? { ...it, name: data.name, id: data.id, group: data.group ?? '' } : it));
      toast({ title: "Label opdateret", description: `Label ${selectedBatchIdx + 1} i listen er opdateret.` });
    } else {
      toast({ title: "Label opdateret", description: "Visningen er blevet opdateret." });
    }
  };

  const onCableSubmit = (data: CableFormValues) => {
    setCableData(data);
    setFontScales({});
    if (selectedBatchIdx !== null) {
      setBatchItems(prev => prev.map((it, i) => i === selectedBatchIdx ? { ...it, name: data.name, id: data.id, group: data.group ?? '' } : it));
      toast({ title: "Kabel label opdateret", description: `Label ${selectedBatchIdx + 1} i listen er opdateret.` });
    } else {
      toast({ title: "Kabel label opdateret", description: "Visningen er blevet opdateret." });
    }
  };

  const onBoxSubmit = (data: BoxFormValues) => {
    setBoxData(data);
    toast({ title: "Kasse label opdateret", description: "Visningen er blevet opdateret." });
  };

  const onRoundSubmit = () => {
    setRoundData(prev => ({ ...prev, name: roundName, id: roundId, group: roundGroup, height: roundHeight, width: printerWidth, codeType: roundShowQr ? "qr" : "none" }));
    setFontScales({});
    if (selectedBatchIdx !== null) {
      setBatchItems(prev => prev.map((it, i) => i === selectedBatchIdx ? { ...it, name: roundName, id: roundId, group: roundGroup } : it));
      toast({ title: "Custom label opdateret", description: `Label ${selectedBatchIdx + 1} i listen er opdateret.` });
    } else {
      toast({ title: "Custom label opdateret", description: "Visningen er blevet opdateret." });
    }
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
    } else if (mode === "cable") {
      cableForm.setValue("id", randomId);
    } else if (mode === "round") {
      setRoundId(randomId);
    }
  };

  useEffect(() => {
    localStorage.setItem("printerWidth", String(printerWidth));
    let h: number;
    if (mode === "equipment") {
      h = labelData.height;
    } else if (mode === "cable") {
      h = cableData.height;
    } else if (mode === "round") {
      h = roundData.height ?? 40;
    } else {
      const itemCount = Math.max(boxItems.length, 1);
      const w = boxData.width;
      h = boxData.autoHeight ? calcBoxAutoHeight(w, itemCount) : boxData.height;
    }
    const w = mode === "round" ? (roundData.width ?? printerWidth) : printerWidth;
    let styleEl = document.getElementById("label-page-size") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "label-page-size";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${w + 5}mm ${h}mm; margin: 0mm; }`;
  }, [mode, printerWidth, labelData.height, cableData.height, roundData.height, roundData.width, boxData.width, boxData.height, boxData.autoHeight, boxItems.length]);

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
    <div className="min-h-screen bg-background p-8 font-sans print:p-0 print:m-0">
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
              {(() => {
                const count = (batchItems.length > 0 ? batchItems.length : 1) * labelCopies;
                return count > 1 ? `Print ${count} Labels` : "Print Label";
              })()}
            </Button>
          </div>
        </div>

        {/* Labels per row + copies */}
        <div className="flex items-start gap-6 p-3 bg-muted rounded-lg flex-wrap">
          <Printer className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground font-medium">Labels pr. rad (105mm rulle):</span>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map(n => {
                const w = Math.floor(96 / n);
                const dots = Math.round(w * 11.811);
                return (
                  <button key={n} type="button"
                    onClick={() => { setLabelsPerRow(n); localStorage.setItem("labelsPerRow", String(n)); }}
                    className={`px-3 py-1.5 text-sm rounded border transition-colors text-left ${labelsPerRow === n ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:border-black'}`}>
                    <span className="font-medium">{n} label{n > 1 ? 's' : ''}</span>
                    <span className="ml-1 opacity-75">— {w}mm / {dots} dots bredde</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground font-medium">Antal kopier:</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setLabelCopies(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded border border-gray-300 bg-white hover:border-black flex items-center justify-center text-lg font-bold">−</button>
              <input type="number" min={1} max={999} value={labelCopies}
                onChange={e => setLabelCopies(Math.max(1, Number(e.target.value)))}
                className="w-16 h-8 text-center border border-gray-300 rounded text-sm font-medium" />
              <button type="button" onClick={() => setLabelCopies(c => Math.min(999, c + 1))}
                className="w-8 h-8 rounded border border-gray-300 bg-white hover:border-black flex items-center justify-center text-lg font-bold">+</button>
            </div>
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
          <Button
            variant={mode === "round" ? "default" : "outline"}
            onClick={() => setMode("round")}
            className="gap-2"
            data-testid="button-mode-round"
          >
            <Square className="h-4 w-4" />
            Custom Label
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Labels {batchItems.length > 0 ? `(${batchItems.length})` : ''}</CardTitle>
              <CardDescription>Tilføj manuelt eller importér fra PDF</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setBatchItems(prev => [...prev, { id: '', name: '', group: '' }])}>
                <Plus className="h-4 w-4" />
                Tilføj nyt label
              </Button>
              {batchItems.length > 0 && (
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setBatchItems([])} data-testid="button-clear-batch">
                  <Trash2 className="h-4 w-4" />
                  Ryd alle
                </Button>
              )}
            </div>
          </CardHeader>
          {batchItems.length > 0 && (
            <CardContent>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {batchItems.map((item, idx) => (
                  <div key={idx}
                    className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors ${selectedBatchIdx === idx ? 'bg-black text-white' : 'bg-muted/50 hover:bg-muted'}`}
                    onClick={() => selectBatchItem(idx)}
                    data-testid={`batch-item-${idx}`}>
                    <input
                      className={`font-mono bg-transparent border-b border-transparent hover:border-gray-300 focus:border-white outline-none w-20 text-xs ${selectedBatchIdx === idx ? 'text-white placeholder:text-gray-400' : 'text-muted-foreground'}`}
                      value={item.id}
                      placeholder="ID"
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, id: e.target.value } : it));
                        if (idx === selectedBatchIdx) {
                          if (mode === "equipment") equipmentForm.setValue("id", e.target.value);
                          else if (mode === "cable") cableForm.setValue("id", e.target.value);
                          else if (mode === "round") setRoundId(e.target.value);
                        }
                      }}
                    />
                    <input
                      className={`font-bold flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-white outline-none min-w-0 ${selectedBatchIdx === idx ? 'text-white placeholder:text-gray-400' : ''}`}
                      value={item.name}
                      placeholder="Navn"
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it));
                        if (idx === selectedBatchIdx) {
                          if (mode === "equipment") equipmentForm.setValue("name", e.target.value);
                          else if (mode === "cable") cableForm.setValue("name", e.target.value);
                          else if (mode === "round") setRoundName(e.target.value);
                        }
                      }}
                      autoFocus={idx === batchItems.length - 1 && item.name === ''}
                    />
                    <input
                      className={`text-xs px-2 py-0.5 rounded border border-transparent hover:border-gray-300 focus:border-white outline-none w-20 ${selectedBatchIdx === idx ? 'bg-white/20 text-white placeholder:text-gray-400' : 'bg-primary/10'}`}
                      value={item.group}
                      placeholder="Gruppe"
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, group: e.target.value } : it));
                        if (idx === selectedBatchIdx) {
                          if (mode === "equipment") equipmentForm.setValue("group", e.target.value);
                          else if (mode === "cable") cableForm.setValue("group", e.target.value);
                          else if (mode === "round") setRoundGroup(e.target.value);
                        }
                      }}
                    />
                    <Button variant="ghost" size="icon" className={`h-6 w-6 flex-shrink-0 ${selectedBatchIdx === idx ? 'text-white hover:bg-white/20' : ''}`}
                      onClick={e => { e.stopPropagation(); setBatchItems(prev => prev.filter((_, i) => i !== idx)); if (selectedBatchIdx === idx) setSelectedBatchIdx(null); }}
                      data-testid={`button-remove-batch-${idx}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>{mode === "equipment" ? "Udstyr Konfiguration" : mode === "cable" ? "Kabel Konfiguration" : mode === "round" ? "Custom Label Konfiguration" : "Kasse Konfiguration"}</CardTitle>
              <CardDescription>
                {mode === "equipment"
                  ? "Indtast oplysninger til udstyr-labelen."
                  : mode === "cable"
                  ? "Indtast oplysninger til kabel-labelen. Denne vikles rundt om kablet."
                  : mode === "round"
                  ? "Lav din egen custom label med valgfri størrelse og skriftstørrelser."
                  : "Indtast kit-navn og tilføj genstande til kasse-labelen."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "round" ? (
                <div className="space-y-6">
                  {/* Navn */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="round-show-name" checked={roundShowName}
                        onChange={e => setRoundShowName(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300" />
                      <label htmlFor="round-show-name" className="text-sm font-medium cursor-pointer">Navn på udstyr</label>
                    </div>
                    <Input placeholder="F.eks. Kamera 1" value={roundName} onChange={e => setRoundName(e.target.value)}
                      data-testid="input-round-name" disabled={!roundShowName} className={!roundShowName ? 'opacity-40' : ''} />
                  </div>
                  {/* ID */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="round-show-id" checked={roundShowId}
                        onChange={e => setRoundShowId(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300" />
                      <label htmlFor="round-show-id" className="text-sm font-medium cursor-pointer">ID Nummer</label>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="F.eks. CAM-001" value={roundId} onChange={e => setRoundId(e.target.value)}
                        data-testid="input-round-id" disabled={!roundShowId} className={!roundShowId ? 'opacity-40 flex-1' : 'flex-1'} />
                      <Button type="button" variant="outline" onClick={generateRandomId} title="Generer tilfældigt ID" data-testid="button-round-random-id">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Gruppe */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="round-show-group" checked={roundShowGroup}
                        onChange={e => setRoundShowGroup(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300" />
                      <label htmlFor="round-show-group" className="text-sm font-medium cursor-pointer">Gruppe / Kit</label>
                    </div>
                    <Input placeholder="F.eks. Kit 1" value={roundGroup} onChange={e => setRoundGroup(e.target.value)}
                      data-testid="input-round-group" disabled={!roundShowGroup} className={!roundShowGroup ? 'opacity-40' : ''} />
                  </div>
                  {/* QR */}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="round-show-qr"
                      checked={roundShowQr}
                      onChange={e => setRoundShowQr(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300" />
                    <label htmlFor="round-show-qr" className="text-sm font-medium cursor-pointer">Vis QR Kode</label>
                  </div>
                  {/* Højde */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Højde (mm)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[10, 20, 30, 40, 50, 70, 100].map(h => (
                        <button key={h} type="button"
                          onClick={() => setRoundHeight(h)}
                          className={`px-3 py-1.5 text-sm rounded border transition-colors ${roundHeight === h ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:border-black'}`}>
                          {h}mm
                        </button>
                      ))}
                    </div>
                    <Input type="number" placeholder="Eller skriv højde..."
                      value={roundHeight}
                      onChange={e => setRoundHeight(Number(e.target.value))} />
                  </div>
                  {/* Font size controls */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Skriftstørrelser</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-16 text-muted-foreground">Navn</span>
                        <input type="range" min={0} max={100} step={0.5} value={roundNameSize} onChange={e => setRoundNameSize(Number(e.target.value))} className="flex-1" />
                        <span className="text-xs w-8 text-right">{roundNameSize === 0 ? 'Auto' : `${roundNameSize}px`}</span>
                        {roundNameSize > 0 && <button type="button" className="text-xs text-muted-foreground hover:text-black" onClick={() => setRoundNameSize(0)}>↺</button>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-16 text-muted-foreground">ID</span>
                        <input type="range" min={0} max={100} step={0.5} value={roundIdSize} onChange={e => setRoundIdSize(Number(e.target.value))} className="flex-1" />
                        <span className="text-xs w-8 text-right">{roundIdSize === 0 ? 'Auto' : `${roundIdSize}px`}</span>
                        {roundIdSize > 0 && <button type="button" className="text-xs text-muted-foreground hover:text-black" onClick={() => setRoundIdSize(0)}>↺</button>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-16 text-muted-foreground">Gruppe</span>
                        <input type="range" min={0} max={100} step={0.5} value={roundGroupSize} onChange={e => setRoundGroupSize(Number(e.target.value))} className="flex-1" />
                        <span className="text-xs w-8 text-right">{roundGroupSize === 0 ? 'Auto' : `${roundGroupSize}px`}</span>
                        {roundGroupSize > 0 && <button type="button" className="text-xs text-muted-foreground hover:text-black" onClick={() => setRoundGroupSize(0)}>↺</button>}
                      </div>
                    </div>
                  </div>
                  {/* Line gap */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mellemrum mellem linjer</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={20} step={0.5} value={roundLineGap} onChange={e => setRoundLineGap(Number(e.target.value))} className="flex-1" />
                      <span className="text-xs w-12 text-right">{roundLineGap === 0 ? 'Auto' : `${roundLineGap}mm`}</span>
                      {roundLineGap > 0 && <button type="button" className="text-xs text-muted-foreground hover:text-black" onClick={() => setRoundLineGap(0)}>↺</button>}
                    </div>
                  </div>
                  {/* Content position */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tekstplacering (op/ned)</label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Op</span>
                      <input type="range" min={-15} max={15} step={0.5} value={roundContentOffset} onChange={e => setRoundContentOffset(Number(e.target.value))} className="flex-1" />
                      <span className="text-xs text-muted-foreground">Ned</span>
                      <span className="text-xs w-12 text-right">{roundContentOffset === 0 ? 'Midt' : `${roundContentOffset > 0 ? '+' : ''}${roundContentOffset}mm`}</span>
                      {roundContentOffset !== 0 && <button type="button" className="text-xs text-muted-foreground hover:text-black" onClick={() => setRoundContentOffset(0)}>↺</button>}
                    </div>
                  </div>
                  <Button type="button" className="w-full" onClick={onRoundSubmit} data-testid="button-update-round">Opdater Visning</Button>
                </div>
              ) : mode === "box" ? (
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Kit / Kasse Nummer <span className="text-muted-foreground font-normal">(til QR kode)</span></label>
                      <Input
                        placeholder="F.eks. 42"
                        value={boxData.kitNumber ?? ""}
                        onChange={e => {
                          const val = e.target.value;
                          setBoxData(prev => ({ ...prev, kitNumber: val }));
                          boxForm.setValue("kitNumber", val);
                        }}
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
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={elementOrder.includes('name')}
                              onChange={e => setElementOrder(prev => e.target.checked ? [...prev.filter(x => x !== 'name'), 'name'] : prev.filter(x => x !== 'name'))}
                              className="h-4 w-4 rounded border-gray-300" />
                            <FormLabel className="cursor-pointer">Navn på udstyr</FormLabel>
                          </div>
                          <FormControl>
                            <Input placeholder="F.eks. Kamera 1" {...field} data-testid="input-equipment-name" disabled={!elementOrder.includes('name')} className={!elementOrder.includes('name') ? 'opacity-40' : ''} />
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
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={elementOrder.includes('id')}
                                onChange={e => setElementOrder(prev => e.target.checked ? [...prev.filter(x => x !== 'id'), 'id'] : prev.filter(x => x !== 'id'))}
                                className="h-4 w-4 rounded border-gray-300" />
                              <FormLabel className="cursor-pointer">ID Nummer</FormLabel>
                            </div>
                            <FormControl>
                              <Input placeholder="F.eks. CAM-001" {...field} data-testid="input-equipment-id" disabled={!elementOrder.includes('id')} className={!elementOrder.includes('id') ? 'opacity-40' : ''} />
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
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={elementOrder.includes('group')}
                              onChange={e => setElementOrder(prev => e.target.checked ? [...prev.filter(x => x !== 'group'), 'group'] : prev.filter(x => x !== 'group'))}
                              className="h-4 w-4 rounded border-gray-300" />
                            <FormLabel className="cursor-pointer">Gruppe / Kit</FormLabel>
                          </div>
                          <FormControl>
                            <Input placeholder="F.eks. Kit 1, Lyd Kit 2" {...field} data-testid="input-equipment-group" disabled={!elementOrder.includes('group')} className={!elementOrder.includes('group') ? 'opacity-40' : ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={equipmentForm.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Højde (mm)</FormLabel>
                            <p className="text-xs text-muted-foreground mb-1">Dots inkluderer +5mm peel-kant (sæt denne værdi i printeren)</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {[10, 20, 30, 40, 50, 70, 100].map(h => {
                                const dots = Math.round((h + 5) * 11.811);
                                return (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => { field.onChange(h); equipmentForm.setValue("preset", "custom"); }}
                                  className={`px-3 py-1.5 text-sm rounded border transition-colors text-left ${field.value === h ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:border-black'}`}
                                >
                                  <span className="font-medium">{h}mm</span>
                                  <span className="ml-1 text-xs opacity-60">/ {dots}d</span>
                                </button>
                                );
                              })}
                            </div>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Eller skriv højde..."
                                {...field}
                                onChange={e => { field.onChange(Number(e.target.value)); equipmentForm.setValue("preset", "custom"); }}
                                data-testid="input-equipment-height"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="hidden">
                        {/* width kept hidden but in form for internal use */}
                        <FormField control={equipmentForm.control} name="width" render={({ field }) => <input type="hidden" {...field} />} />
                        <FormField control={equipmentForm.control} name="preset" render={({ field }) => <input type="hidden" {...field} />} />
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
                              <div className="flex flex-wrap gap-2 mb-2">
                                {[10, 20, 30, 40, 50, 70, 100].map(h => {
                                  const dots = Math.round((h + 5) * 11.811);
                                  return (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => { field.onChange(h); cableForm.setValue("preset", "custom"); }}
                                    className={`px-3 py-1.5 text-sm rounded border transition-colors text-left ${field.value === h ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:border-black'}`}
                                  >
                                    <span className="font-medium">{h}mm</span>
                                    <span className="ml-1 text-xs opacity-60">/ {dots}d</span>
                                  </button>
                                  );
                                })}
                              </div>
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
                  : mode === "round"
                  ? "Den runde label passer til cirkulære klistermærker. Brug print-knappen for at udskrive."
                  : "Kasse-labelen viser alle genstande i kassen. Brug print-knappen for at udskrive."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-8 rounded-lg border-dashed border-2 m-6 overflow-auto gap-4">
              <div ref={previewLabelRef}>
                {mode === "box" ? (
                  <BoxLabelContent data={boxData} items={boxItems} isPreview={true} />
                ) : mode === "round" ? (() => {
                  const previewW = Math.floor((roundData.width ?? printerWidth) / labelsPerRow);
                  const previewItems = batchItems.length > 0 ? batchItems : [{ ...roundData, group: roundData.group ?? '' }];
                  return previewItems.map((item, idx) => (
                    <RoundLabelContent
                      key={idx}
                      data={{ ...roundData, width: previewW, name: item.name, id: item.id, group: item.group ?? '' }}
                      isPreview={true}
                      nameFontSize={roundNameSize}
                      idFontSize={roundIdSize}
                      groupFontSize={roundGroupSize}
                      contentOffset={roundContentOffset}
                      showName={roundShowName}
                      showId={roundShowId}
                      showGroup={roundShowGroup}
                      lineGap={roundLineGap}
                    />
                  ));
                })()
                : batchItems.length > 0 ? (
                  batchItems.map((item, idx) => (
                    mode === "equipment" ? (
                      <EquipmentLabelContent
                        key={idx}
                        data={{ ...labelData, width: labelWidth, name: item.name, id: item.id, group: item.group }}
                        isPreview={true}
                        fontScale={getFontScale(idx)}
                        elementOrder={elementOrder}
                        spacing={labelSpacing}
                        showQrOverride={showQrCode}
                      />
                    ) : (
                      <CableLabelContent
                        key={idx}
                        data={{ ...cableData, width: labelWidth, name: item.name, id: item.id, group: item.group }}
                        isPreview={true}
                        fontScale={getFontScale(idx)}
                      />
                    )
                  ))
                ) : mode === "equipment" ? (
                  <EquipmentLabelContent data={{ ...labelData, width: labelWidth }} isPreview={true} fontScale={getFontScale(0)} elementOrder={elementOrder} spacing={labelSpacing} showQrOverride={showQrCode} />
                ) : (
                  <CableLabelContent data={{ ...cableData, width: labelWidth }} isPreview={true} fontScale={getFontScale(0)} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Area */}
      <div className="hidden print:block">
        <style type="text/css" media="print">
          {`
            @page { margin: 0mm; padding: 0mm; }
            html, body { margin: 0 !important; padding: 0 !important; background: white; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          `}
        </style>
        {mode === "box" ? (() => {
          const boxW = Math.floor(boxData.width / labelsPerRow);
          const totalCopies = boxCopies * labelsPerRow;
          const boxRows: number[][] = [];
          for (let i = 0; i < boxCopies; i++) {
            boxRows.push(Array.from({ length: labelsPerRow }, (_, j) => i * labelsPerRow + j));
          }
          return boxRows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', flexDirection: 'row', pageBreakAfter: rowIdx < boxRows.length - 1 ? 'always' : 'auto', breakAfter: rowIdx < boxRows.length - 1 ? 'page' : 'auto' }}>
              {row.map((_, itemIdx) => {
                const isLast = itemIdx === row.length - 1;
                return <BoxLabelContent key={itemIdx} data={{ ...boxData, width: boxW + (isLast ? 3 : 0) }} items={boxItems} />;
              })}
              <div style={{ width: '2mm', background: 'white', flexShrink: 0 }} />
            </div>
          ));
        })()
        : mode === "round" ? (() => {
          const baseItems = batchItems.length > 0
            ? batchItems.map(item => ({ name: item.name, id: item.id, group: item.group }))
            : [{ name: roundData.name, id: roundData.id, group: roundData.group }];
          const items = Array.from({ length: labelCopies }, () => baseItems).flat();
          const roundRows: typeof items[] = [];
          for (let i = 0; i < items.length; i += labelsPerRow) {
            roundRows.push(items.slice(i, i + labelsPerRow));
          }
          const roundLabelWidth = Math.floor((roundData.width ?? printerWidth) / labelsPerRow);
          return roundRows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', flexDirection: 'row', pageBreakAfter: rowIdx < roundRows.length - 1 ? 'always' : 'auto', breakAfter: rowIdx < roundRows.length - 1 ? 'page' : 'auto' }}>
              {row.map((item, itemIdx) => {
                const isLast = itemIdx === row.length - 1;
                return (
                  <RoundLabelContent
                    key={itemIdx}
                    data={{ ...roundData, width: roundLabelWidth + (isLast ? 3 : 0), name: item.name, id: item.id, group: item.group ?? '' }}
                    nameFontSize={roundNameSize}
                    idFontSize={roundIdSize}
                    groupFontSize={roundGroupSize}
                    contentOffset={roundContentOffset}
                    showName={roundShowName}
                    showId={roundShowId}
                    showGroup={roundShowGroup}
                    lineGap={roundLineGap}
                  />
                );
              })}
              <div style={{ width: '2mm', background: 'white', flexShrink: 0 }} />
            </div>
          ));
        })() : (() => {
          const baseItems = batchItems.length > 0
            ? batchItems.map(item => ({ name: item.name, id: item.id, group: item.group }))
            : [{ name: mode === "equipment" ? labelData.name : cableData.name, id: mode === "equipment" ? labelData.id : cableData.id, group: mode === "equipment" ? labelData.group : cableData.group }];
          const items = Array.from({ length: labelCopies }, () => baseItems).flat();
          // Group into rows based on labelsPerRow
          const rows: typeof items[] = [];
          for (let i = 0; i < items.length; i += labelsPerRow) {
            rows.push(items.slice(i, i + labelsPerRow));
          }
          return rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', flexDirection: 'row', pageBreakAfter: rowIdx < rows.length - 1 ? 'always' : 'auto', breakAfter: rowIdx < rows.length - 1 ? 'page' : 'auto' }}>
              {row.map((item, itemIdx) => {
                const isLast = itemIdx === row.length - 1;
                return mode === "equipment" ? (
                  <EquipmentLabelContent
                    key={itemIdx}
                    data={{ ...labelData, width: labelWidth + (isLast ? 3 : 0), name: item.name, id: item.id, group: item.group }}
                    fontScale={getFontScale(rowIdx * labelsPerRow + itemIdx)}
                    elementOrder={elementOrder}
                    spacing={labelSpacing}
                    showQrOverride={showQrCode}
                  />
                ) : (
                  <CableLabelContent
                    key={itemIdx}
                    data={{ ...cableData, width: labelWidth + (isLast ? 3 : 0), name: item.name, id: item.id, group: item.group }}
                    fontScale={getFontScale(rowIdx * labelsPerRow + itemIdx)}
                  />
                );
              })}
              <div style={{ width: '2mm', background: 'white', flexShrink: 0 }} />
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
