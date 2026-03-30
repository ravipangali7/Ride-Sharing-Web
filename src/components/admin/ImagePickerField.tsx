import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImagePickerFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImagePickerField({ label, value, onChange, className }: ImagePickerFieldProps) {
  const [mode, setMode] = useState<"picker" | "url">(value && value.startsWith("http") ? "url" : "picker");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={className}>
      <Label className="text-sm mb-1.5 block">{label}</Label>
      {value ? (
        <div className="relative group rounded-lg border overflow-hidden bg-muted/20">
          <img
            src={value}
            alt={label}
            className="w-full h-28 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Click to upload</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">or</span>
            <Input
              placeholder="Paste image URL..."
              className="h-7 text-xs"
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
