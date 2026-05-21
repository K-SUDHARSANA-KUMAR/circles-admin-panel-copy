'use client';

import React from "react";
import { VenueForm } from "../venue-form";

const CreateVenuePage = () => {
  return (
    <div className="p-6">
      <VenueForm mode="create" />
    </div>
  );
};

export default CreateVenuePage;
