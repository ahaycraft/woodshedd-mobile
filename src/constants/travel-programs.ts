// Curated so the picker is short and scannable rather than a directory —
// "Other" always escapes to free text for anything not listed. No backend
// enum backs these names; LoyaltyAccount.program just stores whatever
// string the user ends up with.
export const HOTEL_PROGRAMS = [
  'Marriott Bonvoy',
  'Hilton Honors',
  'World of Hyatt',
  'IHG One Rewards',
  'Choice Privileges',
  'Wyndham Rewards',
  'Best Western Rewards',
  'Radisson Rewards',
  'Omni Select Guest',
  'Accor Live Limitless',
  'MGM Rewards',
  'Caesars Rewards',
  'Drury Rewards',
  'Extended Stay Rewards',
  'Red Roof RediCard',
] as const;

export const AIRLINE_PROGRAMS = [
  'Delta SkyMiles',
  'United MileagePlus',
  'American AAdvantage',
  'Southwest Rapid Rewards',
  'Alaska Mileage Plan',
  'JetBlue TrueBlue',
  'Air Canada Aeroplan',
] as const;

export const OTHER_PROGRAM = 'Other' as const;
