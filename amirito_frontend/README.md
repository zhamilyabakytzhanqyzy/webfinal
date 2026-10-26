# Amirito frontend prototype

## Open and test
Open this folder in VS Code and use Live Server to open `index.html`.

## Demo accounts
- `customer1` / `p455w0rd`
- `customer2` / `p455w0rd`
- `admin` / `p455w0rd`

## Frontend features
- Home page with the supplied Amirito logo and map image.
- Login and registration with basic client-side validation.
- Admin product form: category, name, description limited to 100 characters, price slider from 50p to 500p and image upload preview.
- Admin product management grouped by Sandwiches, Drinks and Snacks, including Remove buttons.
- Customer menu with favourites and selection of one sandwich, one drink and one snack.
- Order summary, delivery details, generated order number and printable receipt.
- Active and past order history.
- Admin order management with Picked action and completed-order balance.
- Account and support pages.

## Important
This is the frontend-only stage. It stores prototype data in browser `localStorage`; data is not shared across browsers and demo passwords are not secure. Next, replace localStorage operations with requests to Deno API routes and use SQL as the source of truth. All role permissions and input validation must be enforced by the backend. Payment cards are deliberately not collected. Prices use pence as required by the assignment.
