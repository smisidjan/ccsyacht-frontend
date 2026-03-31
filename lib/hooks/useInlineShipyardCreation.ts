import { useState } from "react";
import { shipyardsApi } from "@/lib/api/client";
import { systemProjectsApi } from "@/lib/api/system";
import type { CreateShipyardRequest, Shipyard } from "@/lib/api/types";

interface UseInlineShipyardCreationProps {
  onSuccess: (shipyard: { id: string; name: string }) => void;
  onError: (error: string) => void;
  tenantId?: string; // For system admin
}

export function useInlineShipyardCreation({
  onSuccess,
  onError,
  tenantId,
}: UseInlineShipyardCreationProps) {
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const resetForm = () => {
    setShowInlineForm(false);
    setName("");
    setAddress("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
  };

  const handleSelectChange = (value: string, currentShipyardId: string) => {
    if (value === "create_new") {
      setShowInlineForm(true);
      return "";
    } else {
      setShowInlineForm(false);
      return value;
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    let newShipyard: Shipyard | null = null;

    try {
      const data: CreateShipyardRequest = {
        name,
      };

      if (address) data.address = address;
      if (contactName) data.contact_name = contactName;
      if (contactEmail) data.contact_email = contactEmail;
      if (contactPhone) data.contact_phone = contactPhone;

      // Use system API if tenantId is provided
      if (tenantId) {
        const response = await systemProjectsApi.createShipyard(tenantId, data);
        newShipyard = response.result;
      } else {
        newShipyard = await shipyardsApi.create(data);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create shipyard");
      setIsCreating(false);
      return;
    }

    // Call onSuccess outside of try-catch so errors in callback don't trigger onError
    if (newShipyard) {
      try {
        onSuccess({ id: newShipyard.identifier, name: newShipyard.name });
        resetForm();
      } catch (err) {
        console.error("Error in onSuccess callback:", err);
      }
    }

    setIsCreating(false);
  };

  const handleCancel = () => {
    resetForm();
  };

  return {
    // State
    showInlineForm,
    isCreating,
    name,
    address,
    contactName,
    contactEmail,
    contactPhone,

    // Setters
    setName,
    setAddress,
    setContactName,
    setContactEmail,
    setContactPhone,

    // Handlers
    handleSelectChange,
    handleCreate,
    handleCancel,
    resetForm,
  };
}
