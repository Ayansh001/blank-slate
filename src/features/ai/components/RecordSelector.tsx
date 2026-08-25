
import { Checkbox } from '@/components/ui/checkbox';

interface RecordSelectorProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function RecordSelector({
  id,
  checked,
  onCheckedChange
}: RecordSelectorProps) {
  return (
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(checkedState) => onCheckedChange(checkedState === true)}
    />
  );
}
