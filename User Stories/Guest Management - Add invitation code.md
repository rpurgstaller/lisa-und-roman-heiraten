# Guest Management - Add invitation code

As an administrator, I want to assign invitation codes to guests so that access to RSVP can be controlled and tracked.

## Acceptance
- When a guest is added to the guest list, a random identifier is created and added in the database
- If the identifier already exists, adding the user fails

## Notes

Pseudo Code: 

```Typescript
import crypto from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateInvitationCode(length = 12): string {
  let result = "";

  for (let i = 0; i < length; i++) {
    result += ALPHABET[
      crypto.randomInt(0, ALPHABET.length)
    ];
  }

  return result;
}
```