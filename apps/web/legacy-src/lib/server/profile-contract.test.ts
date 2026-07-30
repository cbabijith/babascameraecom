import { describe, expect, it } from "vitest";
import { profilePatch } from "./profile-contract";

describe("profilePatch", () => {
  it("emits only the update_my_profile allowlist with normalized values", () => {
    expect(
      profilePatch({
        id: "must-not-pass",
        account_status: "active",
        name: "  Ada Lovelace ",
        phone: " 9999999999 ",
        userType: "Retailer",
        gstData: {
          gstNumber: "22aaaaa0000a1z5",
          registeredCompanyName: "  Analytical Engines ",
        },
      }),
    ).toEqual({
      full_name: "Ada Lovelace",
      phone: "9999999999",
      customer_type: "retailer",
      gstin: "22AAAAA0000A1Z5",
      registered_company_name: "Analytical Engines",
    });
  });
});
