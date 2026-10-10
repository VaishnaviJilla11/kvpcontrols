/**
 * KVP Dealer Network data.
 *
 * KVP_DISTRICTS: list of districts shown in the "Select a District" dropdown.
 * Add more district names here as KVP's dealer network grows.
 *
 * KVP_DEALERS: one object per dealer. Add entries using the template below —
 * the Dealer Network tab on the site picks them up automatically and groups
 * them by district.
 *
 * {
 *   district: "Kadapa",      // must match a name in KVP_DISTRICTS exactly
 *   name: "Dealer / Firm Name",
 *   phone: "9XXXXXXXXX",     // digits only, used for tel: links
 *   address: "Street, area, pincode",
 * }
 */
const KVP_DISTRICTS = ["Tirupati", "Kurnool", "Kadapa", "Warangal"];

const KVP_DEALERS = [
  // Example (remove the comment markers and fill in real details):
  // {
  //   district: "Kadapa",
  //   name: "Sai Electricals",
  //   phone: "9000933113",
  //   address: "Main Road, Kadapa - 516001",
  // },
];

