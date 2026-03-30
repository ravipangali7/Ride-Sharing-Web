import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AdjustCoinsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  currentBalance: number;
  onAdjust: (amount: number, reason: string) => void;
}

export function AdjustCoinsDialog({ open, onOpenChange, userName, currentBalance, onAdjust }: AdjustCoinsDialogProps) {
  const [type, setType] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    const num = parseInt(amount);
    if (!num || num <= 0) { toast.error("Enter a valid amount"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    const adjusted = type === "add" ? num : -num;
    if (type === "deduct" && num > currentBalance) { toast.error("Cannot deduct more than current balance"); return; }
    onAdjust(adjusted, reason);
    setAmount(""); setReason(""); setType("add");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Coins — {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border p-3 bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold font-mono">{currentBalance}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Action</Label>
            <Select value={type} onValueChange={v => setType(v as "add" | "deduct")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Coins</SelectItem>
                <SelectItem value="deduct">Deduct Coins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Amount *</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter coin amount" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Reason *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you adjusting coins?" />
          </div>
          {amount && (
            <div className="rounded-lg border p-3 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">New Balance</p>
              <p className="text-2xl font-bold font-mono">
                {currentBalance + (type === "add" ? parseInt(amount) || 0 : -(parseInt(amount) || 0))}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{type === "add" ? "Add Coins" : "Deduct Coins"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
