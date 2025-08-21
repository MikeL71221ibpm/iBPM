import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield } from "lucide-react";

interface BreakTheGlassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  patientName?: string;
  patientOrganization?: string;
  userOrganization?: string;
}

export default function BreakTheGlassDialog({
  isOpen,
  onClose,
  onApprove,
  patientName,
  patientOrganization,
  userOrganization
}: BreakTheGlassDialogProps) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!agreed) return;
    
    setIsSubmitting(true);
    try {
      await onApprove();
      setAgreed(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAgreed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Cross-Organization Access
          </DialogTitle>
          <DialogDescription className="text-left">
            You are accessing patient data from outside your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Access Details</p>
                <p className="text-amber-700 mt-1">
                  <strong>Patient:</strong> {patientName || 'Unknown'}<br />
                  <strong>Patient Organization:</strong> {patientOrganization || 'Unknown'}<br />
                  <strong>Your Organization:</strong> {userOrganization || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label
              htmlFor="terms"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I confirm that I have a legitimate need to access this patient's data 
              for Treatment, Payment, or Operations purposes. I understand this access 
              will be logged and audited.
            </Label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!agreed || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? 'Logging Access...' : 'Proceed with Access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}