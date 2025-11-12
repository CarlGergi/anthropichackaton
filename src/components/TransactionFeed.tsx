import { Transaction, CategoryType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TransactionFeedProps {
  transactions: Transaction[];
}

const categoryColors: Record<CategoryType, string> = {
  food: "bg-success/10 text-success border-success/20",
  transport: "bg-primary/10 text-primary border-primary/20",
  fun: "bg-accent/10 text-accent border-accent/20",
  essentials: "bg-warning/10 text-warning border-warning/20",
  clothes: "bg-destructive/10 text-destructive border-destructive/20",
  other: "bg-muted text-muted-foreground border-muted",
};

export default function TransactionFeed({ transactions }: TransactionFeedProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions yet. Start logging expenses by talking to PennyPal!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {transactions.slice(0, 20).map((tx) => (
              <div
                key={tx.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={categoryColors[tx.category]}>
                      {tx.category}
                    </Badge>
                    {tx.source === "voice" && (
                      <Badge variant="outline" className="text-xs">
                        🎤 Voice
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {tx.merchant || "Unknown merchant"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    ${tx.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
