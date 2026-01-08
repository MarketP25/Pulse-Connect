import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Plus, Eye, Edit, AlertTriangle } from "lucide-react";

interface FeePolicy {
  version: string;
  effective_at: Date;
  posting_fee_percent: number;
  booking_fee_percent: number;
  transaction_fee_percent: number;
  tiers: Array<{
    name: string;
    max_listings: number;
    weekly_fee_usd: number;
  }>;
  region_overrides?: any;
  notes?: string;
  signature_hash: string;
}

export const FeePolicyRegistry: React.FC = () => {
  const [policies, setPolicies] = useState<FeePolicy[]>([]);
  const [currentPolicy, setCurrentPolicy] = useState<FeePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPolicy, setNewPolicy] = useState<Partial<FeePolicy>>({
    posting_fee_percent: 4,
    booking_fee_percent: 3,
    transaction_fee_percent: 7,
    tiers: [
      { name: "starter", max_listings: 25, weekly_fee_usd: 5 },
      { name: "growth", max_listings: 50, weekly_fee_usd: 150 },
      { name: "enterprise", max_listings: 250, weekly_fee_usd: 450 }
    ]
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/fee-policies", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load fee policies");
      }

      const data = await response.json();
      setPolicies(data.policies || []);

      // Find current active policy
      const current = data.policies?.find((p: FeePolicy) => new Date(p.effective_at) <= new Date());
      setCurrentPolicy(current || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  const createPolicy = async () => {
    if (!newPolicy.version || !newPolicy.effective_at) {
      setError("Version and effective date are required");
      return;
    }

    try {
      const response = await fetch("/api/admin/fee-policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`
        },
        body: JSON.stringify(newPolicy)
      });

      if (!response.ok) {
        throw new Error("Failed to create fee policy");
      }

      setShowCreateDialog(false);
      setNewPolicy({
        posting_fee_percent: 4,
        booking_fee_percent: 3,
        transaction_fee_percent: 7,
        tiers: [
          { name: "starter", max_listings: 25, weekly_fee_usd: 5 },
          { name: "growth", max_listings: 50, weekly_fee_usd: 150 },
          { name: "enterprise", max_listings: 250, weekly_fee_usd: 450 }
        ]
      });
      loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create policy");
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (policy: FeePolicy) => {
    const now = new Date();
    const effectiveAt = new Date(policy.effective_at);

    if (effectiveAt > now) {
      return <Badge variant="secondary">Scheduled</Badge>;
    } else if (currentPolicy?.version === policy.version) {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fee Policy Registry</h1>
          <p className="text-gray-600">Manage global fee policies for the Places marketplace</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Fee Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={newPolicy.version || ""}
                    onChange={(e) => setNewPolicy({ ...newPolicy, version: e.target.value })}
                    placeholder="v2.1.0"
                  />
                </div>
                <div>
                  <Label htmlFor="effective_at">Effective Date</Label>
                  <Input
                    id="effective_at"
                    type="datetime-local"
                    value={
                      newPolicy.effective_at
                        ? new Date(newPolicy.effective_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setNewPolicy({ ...newPolicy, effective_at: new Date(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="posting">Posting Fee (%)</Label>
                  <Input
                    id="posting"
                    type="number"
                    value={newPolicy.posting_fee_percent || ""}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        posting_fee_percent: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="booking">Booking Fee (%)</Label>
                  <Input
                    id="booking"
                    type="number"
                    value={newPolicy.booking_fee_percent || ""}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        booking_fee_percent: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="transaction">Transaction Fee (%)</Label>
                  <Input
                    id="transaction"
                    type="number"
                    value={newPolicy.transaction_fee_percent || ""}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        transaction_fee_percent: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newPolicy.notes || ""}
                  onChange={(e) => setNewPolicy({ ...newPolicy, notes: e.target.value })}
                  placeholder="Policy change rationale..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createPolicy}>Create Policy</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Policy Summary */}
      {currentPolicy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Active Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Version</p>
                <p className="font-semibold">{currentPolicy.version}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Posting Fee</p>
                <p className="font-semibold">{currentPolicy.posting_fee_percent}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Booking Fee</p>
                <p className="font-semibold">{currentPolicy.booking_fee_percent}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Take Rate</p>
                <p className="font-semibold">{currentPolicy.transaction_fee_percent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy History */}
      <Card>
        <CardHeader>
          <CardTitle>Policy History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Posting Fee</TableHead>
                <TableHead>Booking Fee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.version}>
                  <TableCell className="font-medium">{policy.version}</TableCell>
                  <TableCell>{getStatusBadge(policy)}</TableCell>
                  <TableCell>{formatDate(policy.effective_at)}</TableCell>
                  <TableCell>{policy.posting_fee_percent}%</TableCell>
                  <TableCell>{policy.booking_fee_percent}%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
