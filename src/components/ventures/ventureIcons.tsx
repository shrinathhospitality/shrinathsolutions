import {
  Stamp, Repeat, CalendarDays, Building2, UserRound, PenTool,
  Camera, ShieldCheck, PhoneCall, ParkingSquare, Monitor, Cpu,
  Tent, Footprints, Car, Music, UtensilsCrossed, Stars,
  MapPin, Map, Compass, Globe, BedDouble, Route,
  ClipboardList, Users, Handshake, FileText, Megaphone, LayoutGrid, ClipboardCheck,
  Mountain, Sunset, ShoppingBag, Wrench, Landmark, Lightbulb, Newspaper,
  type LucideIcon,
} from 'lucide-react';

export const ventureIconMap: Record<string, LucideIcon> = {
  Stamp, Repeat, CalendarDays, Building2, UserRound, PenTool,
  Camera, ShieldCheck, PhoneCall, ParkingSquare, Monitor, Cpu,
  Tent, Footprints, Car, Music, UtensilsCrossed, Stars,
  MapPin, Map, Compass, Globe, BedDouble, Route,
  ClipboardList, Users, Handshake, FileText, Megaphone, LayoutGrid, ClipboardCheck,
  Mountain, Sunset, ShoppingBag, Wrench, Landmark, Lightbulb, Newspaper,
};

export function VentureIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Icon = ventureIconMap[name] ?? Building2;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
