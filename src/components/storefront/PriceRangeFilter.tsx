import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

const PriceRangeFilter = ({ min, max, value, onChange }: Props) => {
  if (min >= max) return null;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">טווח מחירים</Label>
      <Slider
        min={min}
        max={max}
        step={1}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        className="mt-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground" dir="ltr">
        <span>₪{value[0]}</span>
        <span>₪{value[1]}</span>
      </div>
    </div>
  );
};

export default PriceRangeFilter;
