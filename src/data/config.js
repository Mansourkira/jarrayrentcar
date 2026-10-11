// ============================================================
//  AGENCY SETTINGS & CAR LIST — edit this file to update the site
// ============================================================

export const AGENCY = {
  name: "Jarray Rent Car",
  phone: "+216 00 000 000",        // TODO: real phone number
  whatsapp: "21600000000",         // TODO: international format, digits only (no +, no spaces)
  email: "contact@jarrayrentcar.tn", // TODO: real email
  address: "Houmt Souk, Djerba, Tunisie",
  mapQuery: "Houmt Souk Djerba",   // used for the Google Maps embed
  instagram: "#",
  facebook: "#",
  currency: "DT",
  // Cloudflare dashboard → Analytics & Logs → Web Analytics → Add site → copy the token
  cfAnalyticsToken: "",            // TODO: paste token to enable visit statistics
};

// Rental conditions shown in the "Conditions" section — TODO: confirm every value with the agency
const TODO = "[À CONFIRMER]";
export const RENTAL = {
  deposit: TODO,          // e.g. "500" (DT)
  minAge: TODO,           // e.g. "21"
  licenceYears: "2",
  insuranceExcess: TODO,  // franchise in DT (what the client pays max. in case of damage)
  fuel: "same",           // "same" = return with the same fuel level, "full" = full-to-full
  extraDriver: TODO,      // price per day in DT, e.g. "10" — or "0" if free
  babySeat: TODO,         // price per day in DT
  delivery: TODO,         // delivery outside the airport, e.g. "0" or "20"
};

// Pickup / return locations shown in the booking form
export const LOCATIONS = [
  "Aéroport Djerba-Zarzis (DJE)",
  "Houmt Souk",
  "Zone Touristique Midoun",
  "Aghir",
  "Port d'Ajim",
  "Livraison à l'hôtel",
];

// Cars — replace `image` with your own photos (e.g. "/images/cars/clio.jpg" (put files in public/images/cars/))
// category: "eco" | "compact" | "suv" | "premium"
export const CARS = [
  {
    id: "i10",
    name: "Hyundai Grand i10",
    category: "eco",
    price: 90,
    image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=900&q=70",
    seats: 5, doors: 5, gearbox: "manual", fuel: "essence", ac: true,
  },
  {
    id: "picanto",
    name: "Kia Picanto",
    category: "eco",
    price: 85,
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=70",
    seats: 4, doors: 5, gearbox: "manual", fuel: "essence", ac: true,
  },
  {
    id: "clio",
    name: "Renault Clio 5",
    category: "compact",
    price: 110,
    image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=900&q=70",
    seats: 5, doors: 5, gearbox: "manual", fuel: "diesel", ac: true,
  },
  {
    id: "208",
    name: "Peugeot 208",
    category: "compact",
    price: 120,
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=70",
    seats: 5, doors: 5, gearbox: "auto", fuel: "essence", ac: true,
  },
  {
    id: "tucson",
    name: "Hyundai Tucson",
    category: "suv",
    price: 190,
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=70",
    seats: 5, doors: 5, gearbox: "auto", fuel: "diesel", ac: true,
  },
  {
    id: "duster",
    name: "Dacia Duster",
    category: "suv",
    price: 150,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=70",
    seats: 5, doors: 5, gearbox: "manual", fuel: "diesel", ac: true,
  },
  {
    id: "golf8",
    name: "Volkswagen Golf 8",
    category: "premium",
    price: 220,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
    seats: 5, doors: 5, gearbox: "auto", fuel: "essence", ac: true,
  },
  {
    id: "classA",
    name: "Mercedes Classe A",
    category: "premium",
    price: 280,
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=70",
    seats: 5, doors: 5, gearbox: "auto", fuel: "essence", ac: true,
  },
];
