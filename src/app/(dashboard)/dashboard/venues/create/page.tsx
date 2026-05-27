'use client';

import React from "react";
import { VenueForm } from "../venue-form";

const CreateVenuePage = () => {
  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <VenueForm mode="create" />
    </div>
  );
};

export default CreateVenuePage;
