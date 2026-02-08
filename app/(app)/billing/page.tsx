"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function BillingPage() {
  // dummy UI-only billing (hackathon mode)
  const [plan, setPlan] = React.useState<"Free" | "Pro">("Free");

  const monthlyLimit = plan === "Free" ? 20000 : 200000;
  const used = plan === "Free" ? 4820 : 35210;

  const pct = clamp(Math.round((used / monthlyLimit) * 100), 0, 100);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display text-2xl tracking-tight">Billing</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Tokens are dummy for now. We’ll wire this to Supabase later.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[24px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="font-display text-lg">Current plan</CardTitle>
              <Badge variant={plan === "Free" ? "secondary" : "default"} className="rounded-full">
                {plan}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-[18px] border bg-card/40 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-muted-foreground">Monthly token limit</div>
                <div className="font-medium">{monthlyLimit.toLocaleString()}</div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Used</div>
                  <div className="font-medium">
                    {used.toLocaleString()} <span className="text-muted-foreground">({pct}%)</span>
                  </div>
                </div>

                <div className="mt-2 h-2 w-full rounded-full bg-muted/60">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                    aria-label="Token usage progress"
                  />
                </div>

                {pct >= 85 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Low tokens. Upgrade to keep generating plans.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                onClick={() => setPlan("Pro")}
                disabled={plan === "Pro"}
              >
                Upgrade to Pro
              </Button>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => setPlan("Free")}
                disabled={plan === "Free"}
              >
                Switch to Free
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Hackathon note: In the real version, each AI tool call would write a token transaction
              row and update these values live.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Recent usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Plan my day", tokens: 420 },
              { label: "Resolve conflicts", tokens: 260 },
              { label: "Generate 5K plan", tokens: 980 },
              { label: "Regenerate plan", tokens: 510 },
            ].map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-[18px] border bg-card/40 px-4 py-3"
              >
                <div className="text-sm">{row.label}</div>
                <div className="text-sm text-muted-foreground">{row.tokens} tokens</div>
              </div>
            ))}

            <div className="text-xs text-muted-foreground">
              These are placeholders. Next step is logging real calls from the Tambo tool pipeline.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}