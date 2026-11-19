// ============================================================
//  AGENCY SETTINGS & CAR LIST — edit this file to update the site
// ============================================================

export const AGENCY = {
  name: "Jarray Rent Car",
  phone: "+216 50 733 299",
  whatsapp: "21650733299",         // TODO: confirm this number is on WhatsApp
  email: "jarrayrent@gmail.com",
  address: "Avenue Habib Thameur, Houmt Souk 4180, Djerba",
  mapQuery: "VVH9+QG Houmt Souk",  // Google plus code of the agency, used for the map
  instagram: "#",
  facebook: "https://www.facebook.com/profile.php?id=61589340667273",
  currency: "DT",
  // Cloudflare dashboard → Analytics & Logs → Web Analytics → Add site → copy the token
  cfAnalyticsToken: "",            // TODO: paste token to enable visit statistics
};

// Rental conditions shown in the "Conditions" section — TODO: confirm every value with the agency
const TODO = "[À CONFIRMER]";
export const RENTAL = {
  deposit: "1000 à 3000",  // varies per car, see CARS[].deposit
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

// Cars — photos live in public/cars. Prices are DT per day. `deposit` = caution (DT).
// showroomImage (optional) = picture used only in the 3D showroom (stock photos from Wikimedia Commons, CC0)
// category: "eco" | "compact" | "suv" | "premium"   ·   fuel is optional ("essence" | "diesel")
export const CARS = [
  {
    id: "picanto-bm",
    name: "Kia Picanto",
    category: "eco",
    price: 100, deposit: 1000,
    image: "/cars/picanto-1.jpg",
    showroomImage: "/cars/showroom-picanto.jpg",
    seats: 5, doors: 5, gearbox: "manual", ac: true,
  },
  {
    id: "picanto-bo",
    name: "Kia Picanto",
    category: "eco",
    price: 110, deposit: 1000,
    image: "/cars/picanto-2.jpg",
    showroomImage: "/cars/showroom-picanto.jpg",
    seats: 5, doors: 5, gearbox: "auto", ac: true,
  },
  {
    id: "clio5-bm",
    name: "Renault Clio 5",
    category: "compact",
    price: 130, deposit: 1500,
    image: "/cars/clio-grey-1.jpg",
    showroomImage: "/cars/showroom-clio.jpg",
    seats: 5, doors: 5, gearbox: "manual", ac: true,
  },
  {
    id: "emgrand-bm",
    name: "Geely Emgrand",
    category: "premium",
    price: 160, deposit: 2000,
    image: "/cars/sedan-3.jpg",
    seats: 5, doors: 4, gearbox: "manual", ac: true,
  },
];
