import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button, Card, Input } from "./packages/ui-components";

export const AdminContactPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-pulse-cyan-500 hover:bg-pulse-cyan-400 text-orbit-blue-primary p-lg rounded-full shadow-2xl flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle size={24} />
        <span className="font-bold">Help</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 md:w-96 animate-in slide-in-from-bottom-4 duration-300">
          <Card elevated className="!bg-nebula-900 border-pulse-cyan-500/30">
            <div className="flex justify-between items-center mb-md border-b border-grid-silver/20 pb-md">
              <h3 className="text-h4 font-bold">Contact Admin</h3>
              <button onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form
              className="space-y-md"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Request logged in MARP HashChain");
                setIsOpen(false);
              }}
            >
              <div className="space-y-xs">
                <label className="text-caption text-grid-silver">Category</label>
                <select className="w-full bg-cosmic-slate border border-grid-silver/30 p-sm rounded-xl text-body outline-none focus:border-pulse-cyan-500">
                  <option>Contact Support</option>
                  <option>Report Issue</option>

                  <option>Business Inquiry</option>
                  <option>Report Fraud</option>
                  <option>Feature Request</option>
                </select>
              </div>

              <Input label="Description" placeholder="How can we assist?" />

              <Button variant="primary" isFullWidth>
                Send Request
              </Button>
              <p className="text-[10px] text-center text-grid-silver opacity-50">
                All inquiries are signed.
              </p>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
