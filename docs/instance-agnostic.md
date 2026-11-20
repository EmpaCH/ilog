# iLog on any openBIS instance

Until now iLog only worked with the Lab 205 setup in openBIS: fixed space, project and collection codes, and a one-time "Initialize Workspace" step. With the changes in the `refactor/instance-agnostic` branch (together with the login and build fixes already merged to `master`), iLog works on any openBIS instance with the ELN installed. Everything instance-specific is now configured by an openBIS admin inside iLog.

## 1. What changed

### Where things are stored

| | Before | Now |
|---|---|---|
| Logbook entries | Fixed collection `LOGBOOK_COLLECTION` (in `/LAB205_EQUIPMENT/ILOG`); entries recognised by the `ILOG_LOGBOOK` property | One logbook collection per instance, chosen by an admin in **Settings**. It is stored as `ilogLogbookCollection` in the ELN settings (`/ELN_SETTINGS/GENERAL_ELN_SETTINGS`). Entries are recognised by being in that collection. |
| Instruments and components | Fixed `INSTRUMENT_COLLECTION` / `COMPONENT_COLLECTION` | Any collection. When creating an object, the user picks the collection. Each type can have a **default collection** (type metadata `defaultCollection`), which is filled in automatically. |
| Type category (Instrument / Component / Logbook entry) | Type metadata `collectionType = INSTRUMENT_COLLECTION` etc. | Type metadata `category = INSTRUMENT \| COMPONENT \| LOGBOOK_ENTRY \| LOCATION`. The old `collectionType` key is still read, and it is replaced by `category` when the type is saved in iLog. |
| Locations | Only objects of the hardcoded type `ROOM` | Any type marked as **Location** in Settings. The location picker lists objects of those types. |
| Logbook entry type look | – | Logbook entry types have a color (metadata `color`) and an optional icon (prefixed to the description). Types without a description are shown by their code. |

### Admin features (Settings page)

The **Settings** page (previously "Import") is only visible to openBIS instance admins, directly or through a user group.

- **Logbook collection**
  - Shows the current state: not set up; working, with the number of entries; or not found.
  - An admin can choose an existing collection or create a new one. A new space, project and collection are created as needed, and a new space is added to the ELN inventory spaces.
  - When changing the collection, the existing entries can be moved to the new one. The setting is only saved after the move succeeded.
- **Logbook access**
  - openBIS gives roles per space or project, not per collection. So access is given on the **project** of the logbook collection.
  - Admins can give a user group or a single user the role Observer (view), User (view, create, edit) or Power user, and remove it again.
  - Roles on the whole space are listed too, but are managed in openBIS.
- **Import Object Types**
  - Marks existing openBIS types as Instrument, Component or Location, or removes them from iLog.
  - A warning lists Component types that lack the `LOCATION` property. Without it, components can't be added to an instrument.

### Other changes

- **Admin-only areas:** the Types, Settings and Trashcan pages are hidden from users who are not openBIS admins (they couldn't use them anyway). Users without access to the logbook see a message asking them to contact an admin.
- **ELN integration:** types created or updated in iLog are registered in the ELN settings (`sampleTypeDefinitionsExtension`), so they appear in the ELN menus. Existing ELN configuration of a type is never overwritten. Deleting a type removes its entry.
- **Logbook list:** a spinner is shown while loading, and the reason is shown when the logbook can't be used, instead of an empty table.
- **Type lists:** all type lists refresh after creating, changing or deleting a type.
- **Small UI fixes:** help text below form fields is left-aligned, and the row buttons in the type table are right-aligned.

### Removed

- The "Initialize Workspace" flow and everything that created the fixed Lab 205 space, project, collections, and the `ILOG` property / `ILOG_BASE_TYPES` vocabulary.
- **Object and administrative-data import/export, and type export/import.** These only worked against a localhost openBIS and wrote into the fixed Lab 205 locations.
- The start-up code meant to create the `ELN_PREVIEW` dataset type. It never actually ran. iLog relies on the ELN providing that type.

The legacy properties `ILOG` and `ILOG_LOGBOOK` are **not** deleted from existing types. iLog only hides them in forms.

### Login (merged to master via `fix-login`)

- **Session token:** stored in a cookie named `openbis` (path `/`, kept for 7 days), the same as the openBIS UI. This prepares iLog to run as an openBIS plugin that shares the openBIS login.
- **Start-up:** the stored session is checked with openBIS. It is only cleared when openBIS rejects it.
- **No redirect on reload:** a spinner is shown until the session check is done, so a reload no longer jumps to the login page.
- **Cleanup:** old `token`/`user` entries in localStorage are removed.

### Build, CI and tests

- **Docker build:** the Docker image is built from a committed `package-lock.json` with `npm ci` on `node:24-alpine`, so builds are reproducible (merged to master via `fix/lockfile-dockerfile`).
- **Unit tests:** the old tests needed a local openBIS and no longer loaded. They were replaced by 41 unit tests with a fake openBIS. The tests cover type categories, the logbook collection setting, logbook access and the login session handling, and run with `npx vitest run`.
- **CI:** a `test` stage runs the tests before the image is built. A failing test stops the build.

---

## 2. What an openBIS instance needs

- **The openBIS ELN** must be installed. iLog stores its settings in `/ELN_SETTINGS/GENERAL_ELN_SETTINGS`, and uses the ELN's `COLLECTION` collection type and `ELN_PREVIEW` dataset type (for object images).
- **An openBIS instance admin** must do the setup in iLog's Settings.
- **The instance must be listed in iLog's login dropdown.** The list is [`src/config/instances.ts`](../src/config/instances.ts), so adding an instance means changing the code and redeploying iLog.
- **Users log in with a Personal Access Token** from openBIS.

---

## 3. Migrating Lab 205

Lab 205's data stays where it is: nothing is moved or deleted. The existing Instrument, Component and Logbook entry types are recognised automatically through their old `collectionType` key. The migration is mainly about telling iLog where things are.

### Before the switch

1. **Note the current numbers** in the old iLog version (or in openBIS):
   - logbook entries in `/LAB205_EQUIPMENT/ILOG/LOGBOOK_COLLECTION`;
   - instruments and components in their collections.
2. **Check that the `ELN_PREVIEW` dataset type exists** (openBIS admin UI → Types → Dataset Types). Otherwise image uploads fail.
3. **Agree on a switch date.** All users switch at once: once the new version is deployed, the old one is gone.
4. **Rollback limitation:** as soon as an admin saves a type in the new version (in the Types page), the type's old `collectionType` key is replaced by `category`, and the old iLog version no longer recognises that type. If a rollback might be needed, avoid editing types until the new version has been confirmed to work.

### Right after deployment (an admin, in iLog)

1. **Settings → Logbook collection → Use existing collection:** choose `/LAB205_EQUIPMENT/ILOG/LOGBOOK_COLLECTION`. Do **not** move entries; it is the same collection. The section should then show the expected number of entries.
2. **Settings → Access:** check who has a role on `/LAB205_EQUIPMENT/ILOG` or on the space `/LAB205_EQUIPMENT`. Anyone who used iLog before should already be covered. If not, give the lab's user group the **User** role.
3. **Settings → Import Object Types:**
   - Check that the instrument and component types show the right iLog type.
   - Mark `ROOM` (and any other place types) as **Location**. Before, `ROOM` was hardcoded. Without this step, the location picker is empty.
   - Check that no warning about a missing `LOCATION` is shown.
4. **Types:** for each instrument and component type, set the **default collection**:
   - instrument types: `/LAB205_EQUIPMENT/ILOG/INSTRUMENT_COLLECTION`;
   - component types: `/LAB205_EQUIPMENT/ILOG/COMPONENT_COLLECTION`.

   Otherwise users have to pick the collection each time they create an object. Saving a type here also switches it to the new `category` key (see the rollback limitation above) and registers it in the ELN menus.

### Check

1. **Compare the numbers** of logbook entries, instruments and components with the ones you noted.
2. **As an admin:** create a test instrument with an image, a component, and a logbook entry; then delete them again.
3. **As a normal user:**
   - Types, Settings and Trashcan are not in the menu;
   - the logbook list shows the entries;
   - creating an entry works.

### Afterwards

The legacy `ILOG` / `ILOG_LOGBOOK` properties and the `collectionType` fallback stay for now. They can be removed once Lab 205 runs stably on the new version (see [what is left](#5-what-is-left-to-do)).

---

## 4. Setting up iLog for a new lab

### Prerequisites

- **openBIS:** an instance with the ELN installed, and the `ELN_PREVIEW` dataset type present.
- **iLog deployment:** the iLog maintainers add the instance to [`src/config/instances.ts`](../src/config/instances.ts) (label and hostname) and redeploy iLog.
- **An admin:** someone with the openBIS instance admin role.
- **Collections:** the lab decides where instruments and components should live. Create these collections in openBIS (ELN or admin UI) first. iLog only creates the collection for the logbook.

### Setup by the admin

1. **Log in** to iLog with a Personal Access Token and choose the lab's instance.
2. **Settings → Logbook collection:** create a new collection (e.g. space `MY_LAB`, project `ILOG`, collection `LOGBOOK`) or choose an existing one.
3. **Settings → Access:** give the lab's user group the **User** role. Use **Observer** for read-only users. A user group is recommended over single users: new colleagues get access as soon as they are added to the group in openBIS.
4. **Types:** define what the lab wants to track, in one of two ways:
   - **Create types in iLog's Types page:** Instrument types, Component types (which automatically get `LOCATION`) and Logbook entry types (with a color and optional icon). Give each Instrument and Component type a **default collection**.
   - **Use existing openBIS types:** mark them in **Settings → Import Object Types** as Instrument or Component. If the warning shows a Component type without `LOCATION`, add the property in the Types page or the openBIS admin UI. Logbook entry types can only be created in iLog's Types page.
5. **Locations:** in Settings → Import Object Types, mark the types whose objects are places (e.g. rooms) as **Location**.
6. **Access to instruments and components:** iLog only manages access to the logbook. Users also need a role on the spaces or projects holding the instrument and component collections. Give it in openBIS.

### For users

- **Log in:** create a Personal Access Token in openBIS, then log in to iLog with it and the lab's instance.
- **No access:** if the logbook says it can't be used, an admin has to give access (step 3 above).

---

## 5. What is left to do

### Next steps

1. **Lab 205 migration:** follow [section 3](#3-migrating-lab-205).
2. **Remove the Lab 205 leftovers**, only after the migration:
   - hiding the `ILOG` / `ILOG_LOGBOOK` properties;
   - the `collectionType` fallback (first save each Lab 205 type once in the new version, so they all have `category`);
   - the `IMAGES` dataset type handling in image display.
3. **Dependencies and vulnerabilities**, in their own branch:
   - `npm audit` reports 35 vulnerabilities (6 critical), including `dompurify`, which is shipped in the app.
   - `npm audit fix` is currently blocked: `@tanstack/router-plugin` needs Vite 6+, and the project uses Vite 5. Upgrading means updating Vite together with `@vitejs/plugin-react-swc`, the router plugin and vitest.
   - npm also warns that the install scripts of `@swc/core` and `esbuild` are not covered by `allowScripts`. This should be handled so that a future npm version doesn't break `npm ci`.
4. **iLog as an openBIS plugin:** when served by openBIS (e.g. under `/openbis/webapp/ilog/`), use the shared `openbis` session cookie and skip the login page and instance dropdown.

### Possible improvements

- **The openBIS proxy accepts any hostname.** Caddy (and the Vite dev server) forward `/openbis`, `/datastore_server` and `/afs-server` requests to whatever hostname is in the `openbis-instance` cookie, without checking it against `instances.ts`, and with TLS verification turned off. Restricting this to the known instances would be safer.
