import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminCustomers = () => {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminLayout title="לקוחות">
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, אימייל, טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>אימייל</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead>הזמנות</TableHead>
              <TableHead>סה״כ הוצאות</TableHead>
              <TableHead>תגיות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">טוען...</TableCell>
              </TableRow>
            ) : customers && customers.length > 0 ? (
              customers.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/admin/customers/${customer.id}`} className="font-medium text-foreground hover:text-accent">
                      {customer.full_name || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{customer.email}</TableCell>
                  <TableCell className="text-sm" dir="ltr">{customer.phone || "—"}</TableCell>
                  <TableCell>{customer.total_orders || 0}</TableCell>
                  <TableCell className="font-medium">₪{Number(customer.total_spent || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {customer.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      )) || "—"}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  אין לקוחות עדיין.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
