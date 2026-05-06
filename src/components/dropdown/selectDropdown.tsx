import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Option = {
  value: string;
  label: string;
};

interface CommonSelectProps {
  value?: string;
  placeholder?: string;
  options: Option[];
  onChange: (value?: string) => void;
  className?: string;

  /** Extra props */
  showAllOption?: boolean; // show "All" option
  sortOptions?: boolean;   // enable alphabetical sorting
  customSort?: (a: Option, b: Option) => number; // override sorting logic
}

const CommonSelect: React.FC<CommonSelectProps> = ({
  value,
  placeholder = "Select",
  options,
  onChange,
  className,
  showAllOption = false,
  sortOptions = false,
  customSort,
}) => {
  const internalValue = value ?? (showAllOption ? "all" : "");

  // apply sorting logic
  const renderedOptions = [...options];
  if (sortOptions) {
    renderedOptions.sort(customSort ?? ((a, b) => a.label.localeCompare(b.label)));
  }

  return (
    <Select
      value={internalValue}
      onValueChange={(val) => onChange(val === "all" ? undefined : val)}
    >
      <SelectTrigger className={className ?? "md:w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && <SelectItem value="all">All</SelectItem>}

        {renderedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CommonSelect;
