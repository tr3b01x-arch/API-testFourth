# Fourth-compatible API simulator

A local Express server for developing a React/Node integration before you have Fourth API credentials.

## Important compatibility note

This is a **development simulator**, not an official Fourth product and not a replacement for a tenant's API documentation.

- `GET /api/shifts?fromDate=YYYYMMDD&toDate=YYYYMMDD` follows the publicly documented Fourth Schedules API style. The sample schedule fields `locationTnAId`, `fourthAccountId`, `workDate`, `startDateTime`, `endDateTime`, `breakMinutes`, `roleName`, `locationName`, and `departmentName` are based on public Fourth documentation examples.
- Employee, employment, absence, pay-part, location and division endpoints use clearly synthetic, plausible JSON schemas. They are **not guaranteed to match Fourth's exact live schema or endpoint paths**. Obtain the API guide and tenant-specific credentials from Fourth and validate these resources before changing your app to live mode.
- The simulator adds `employeeId`, `employeeName`, `shiftId`, `published`, and `status` to shifts for convenient local UI joins. These are simulator extensions and must not be assumed to exist in the real Schedules API response.
- All data is fictional. Do not load real employee personal, payroll, health or other sensitive information into this demo.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
cp .env.example .env
npm install
npm start
```

Server: `http://localhost:4010`  
Health: `http://localhost:4010/health`  
Docs: `http://localhost:4010/docs`

Default demo credentials:
- Username: `demo`
- Password: `demo123`

Change these in `.env` before sharing the server or exposing it outside localhost.

## Test the schedules endpoint

```bash
curl -u demo:demo123 \
  "http://localhost:4010/api/shifts?fromDate=20261102&toDate=20261108"
```

Example response (one item; the simulator returns a JSON array):

```json
{
  "locationTnAId": "8001",
  "fourthAccountId": "0058E000001hYirQAE",
  "workDate": "2026-11-02",
  "startDateTime": "2026-11-02T07:00:00:0000",
  "endDateTime": "2026-11-02T11:00:00:0000",
  "breakMinutes": 0,
  "roleName": "Team Member",
  "locationName": "Acme Covent Garden",
  "departmentName": "1. Front of House"
}
```

The real endpoint response is an array, not a single object.

## Endpoints

All `/api/*` endpoints require HTTP Basic authentication.

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/shifts?fromDate=YYYYMMDD&toDate=YYYYMMDD` | Schedules API-style; both dates required |
| GET | `/api/organisations/ORG-1001` | Organisation record |
| GET | `/api/organisations/ORG-1001/Employees` | Synthetic employee records |
| GET | `/api/organisations/ORG-1001/Employees/Employments` | Synthetic employment records |
| GET | `/api/organisations/ORG-1001/Employees/Absences` | Synthetic absences |
| GET | `/api/organisations/ORG-1001/Employees/PayParts` | Synthetic pay parts |
| GET | `/api/organisations/ORG-1001/Locations` | Synthetic locations |
| GET | `/api/organisations/ORG-1001/Divisions` | Synthetic divisions/departments |
| GET | `/api/time-attendance` | Simulator-only attendance extension |
| POST | `/api/_mock/reset` | Restore seed data |

Collection endpoints except `/shifts` support:
- `page` (default 1)
- `pageSize` (default 100, maximum 500)
- `all=true` to return the full collection
- `employeeId` and `locationId` filters where relevant
- `fromDate` and `toDate` filters where relevant (format `YYYYMMDD`)

Pagination metadata is returned in `X-Total-Count`, `X-Page`, and `X-Page-Size` headers.

## Example calls

```bash
# Employees
curl -u demo:demo123 \
  "http://localhost:4010/api/organisations/ORG-1001/Employees?all=true"

# One employee's employment records
curl -u demo:demo123 \
  "http://localhost:4010/api/organisations/ORG-1001/Employees/Employments?employeeId=EMP-0001"

# Absences in a date range
curl -u demo:demo123 \
  "http://localhost:4010/api/organisations/ORG-1001/Employees/Absences?fromDate=20261101&toDate=20261130"

# Reset mock data
curl -X POST -u demo:demo123 http://localhost:4010/api/_mock/reset
```

## React example

```js
const FOURTH_BASE_URL = "http://localhost:4010/api";
const auth = "Basic " + btoa("demo:demo123");

export async function getShifts(fromDate, toDate) {
  const url = new URL(`${FOURTH_BASE_URL}/shifts`);
  url.searchParams.set("fromDate", fromDate); // YYYYMMDD
  url.searchParams.set("toDate", toDate);
  const response = await fetch(url, {
    headers: { Authorization: auth }
  });
  if (!response.ok) throw new Error(`Fourth API error: ${response.status}`);
  return response.json();
}

export async function getEmployees() {
  const response = await fetch(
    `${FOURTH_BASE_URL}/organisations/ORG-1001/Employees?all=true`,
    { headers: { Authorization: auth } }
  );
  if (!response.ok) throw new Error(`Fourth API error: ${response.status}`);
  return response.json();
}
```

**Security:** Do not put production Fourth credentials in browser-side React code. In production, your React app should call your own Node backend, which stores the Fourth credentials in server-side environment variables and proxies the requests.

## Recommended path to exact live compatibility

1. Ask your Fourth account contact for the API documentation and sandbox/tenant credentials for Schedules and UK Employee APIs.
2. Capture one sanitized response for each resource (employee, employment, absence, location, division, pay part).
3. Compare the exact field names, nullability, date/time conventions, pagination, filters, authentication and error bodies.
4. Update the simulator fixtures and route serializers to match those contracts exactly.
5. Keep the simulator's extra fields behind a flag or remove them before contract tests.

Public starting point: https://developer.fourth.com/ (confirm current documentation access and product-specific API references with Fourth).
