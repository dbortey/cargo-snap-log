import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Package, User } from "lucide-react";
import { EntryDetailsDialog } from "./EntryDetailsDialog";

interface ContainerEntry {
  id: string;
  container_number: string;
  container_size: string;
  user_name: string;
  created_at: string;
  container_image?: string | null;
  license_plate_image?: string | null;
}

export const EntriesTable = () => {
  const [selectedEntry, setSelectedEntry] = useState<ContainerEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["container-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("container_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContainerEntry[];
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading entries...</div>
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Entries Yet</h3>
          <p className="text-muted-foreground">
            Start recording container entries using the button above
          </p>
        </div>
      </Card>
    );
  }

  const handleRowClick = (entry: ContainerEntry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Container Number</TableHead>
                <TableHead className="font-semibold">Size</TableHead>
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Recorded At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow 
                  key={entry.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(entry)}
                >
                  <TableCell className="font-mono font-medium">{entry.container_number}</TableCell>
                  <TableCell>{entry.container_size}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{entry.user_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EntryDetailsDialog
        entry={selectedEntry}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};
