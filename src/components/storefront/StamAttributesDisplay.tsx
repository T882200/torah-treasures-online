import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, PenTool, ScrollText, User, BookOpen, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StamAttributesDisplayProps {
  productId: string;
}

const KOSHER_COLORS: Record<string, string> = {
  "כשר": "bg-green-100 text-green-800 border-green-200",
  "מהודר": "bg-accent/20 text-accent-foreground border-accent/30",
  "מהודר מן המהודר": "bg-amber-100 text-amber-800 border-amber-300",
};

const StamAttributesDisplay = ({ productId }: StamAttributesDisplayProps) => {
  const { data: attrs } = useQuery({
    queryKey: ["stam-attrs", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stam_attributes")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!attrs) return null;

  const items = [
    { icon: Shield, label: "רמת כשרות", value: attrs.kosher_level },
    { icon: ScrollText, label: "נוסח", value: attrs.nusach },
    { icon: PenTool, label: "סוג כתב", value: attrs.script_type },
    { icon: BookOpen, label: "סוג בתים", value: attrs.housing_type },
    { icon: User, label: "שם הסופר", value: attrs.sofer_name },
    { icon: Shield, label: "בד\"ץ", value: attrs.beit_din },
  ].filter(item => item.value);

  if (items.length === 0 && !attrs.certificate_info) return null;

  return (
    <div className="border-t border-border pt-6 space-y-4">
      <h3 className="font-display font-bold text-lg flex items-center gap-2">
        <Shield className="h-5 w-5 text-accent" />
        פרטי סת״ם והכשר
      </h3>

      {/* Kosher level badge */}
      {attrs.kosher_level && (
        <div className="mb-3">
          <Badge className={`text-sm px-3 py-1 ${KOSHER_COLORS[attrs.kosher_level] || "bg-muted text-foreground"}`}>
            {attrs.kosher_level}
          </Badge>
        </div>
      )}

      {/* Attributes grid */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2 bg-muted/50 rounded-md p-3">
            <item.icon className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground block">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          </div>
        ))}
        {attrs.parchment_size_cm && (
          <div className="flex items-start gap-2 bg-muted/50 rounded-md p-3">
            <ScrollText className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground block">גודל קלף</span>
              <span className="text-sm font-medium text-foreground">{attrs.parchment_size_cm} ס״מ</span>
            </div>
          </div>
        )}
      </div>

      {/* Checks */}
      <div className="flex gap-4 text-sm">
        {attrs.is_checked_by_computer && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" /> נבדק במחשב
          </span>
        )}
        {attrs.is_checked_by_human && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" /> נבדק ידנית
          </span>
        )}
      </div>

      {/* Certificate */}
      {attrs.certificate_info && (
        <div className="bg-accent/5 border border-accent/20 rounded-md p-4">
          <h4 className="text-sm font-bold text-foreground mb-1">📜 תעודת הכשר</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{attrs.certificate_info}</p>
        </div>
      )}

      {attrs.additional_notes && (
        <p className="text-sm text-muted-foreground italic">{attrs.additional_notes}</p>
      )}
    </div>
  );
};

export default StamAttributesDisplay;
