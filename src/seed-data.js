export function makeSeed() {
  const organisationId = "ORG-1001";
  const locations = [
    { id: "LOC-001", organisationId, locationTnAId: "8001", locationName: "Acme Covent Garden", name: "Acme Covent Garden", active: true },
    { id: "LOC-002", organisationId, locationTnAId: "8002", locationName: "Acme Shoreditch", name: "Acme Shoreditch", active: true },
    { id: "LOC-003", organisationId, locationTnAId: "8003", locationName: "Acme Stratford", name: "Acme Stratford", active: true }
  ];
  const divisions = [
    { id: "DIV-FOH", organisationId, name: "Front of House", divisionName: "1. Front of House" },
    { id: "DIV-BOH", organisationId, name: "Back of House", divisionName: "2. Back of House" },
    { id: "DIV-MGMT", organisationId, name: "Management", divisionName: "3. Management" }
  ];
  const roles = ["Team Member", "Senior Team Member", "Supervisor", "Chef", "Kitchen Porter", "Assistant Manager", "Manager"];
  const firstNames = ["Alex","Jamie","Morgan","Taylor","Sam","Jordan","Casey","Riley","Avery","Charlie","Drew","Robin","Cameron","Jess","Lee","Harper","Finley","Rowan","Sky","Ellis"];
  const lastNames = ["Smith","Jones","Patel","Brown","Taylor","Wilson","Khan","Davies","Evans","Thomas","Roberts","Walker","Wright","Green","Hall","Clarke","Lewis","Young","King","Scott"];
  const employees = [];
  const employments = [];
  for (let i=0; i<40; i++) {
    const id = `EMP-${String(i+1).padStart(4,"0")}`;
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i*7) % lastNames.length];
    const location = locations[i % locations.length];
    const role = roles[i % roles.length];
    const employee = {
      employeeId: id,
      faid: `FAID-${String(71000+i)}`,
      fourthAccountId: "0058E000001hYirQAE",
      payrollNumber: `PAY-${String(3000+i)}`,
      firstName, lastName, knownAs: firstName,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i+1}@example.test`,
      mobileNumber: `+447700900${String(i).padStart(3,"0")}`,
      active: i !== 38,
      organisationId,
      primaryLocationId: location.id,
      primaryLocationName: location.name,
      jobTitle: role,
      divisionId: role.includes("Chef") || role.includes("Kitchen") ? "DIV-BOH" : (role.includes("Manager") ? "DIV-MGMT" : "DIV-FOH"),
      startDate: `202${i%5}-0${(i%9)+1}-01`,
      // Entirely synthetic; do not use as real employee or payroll data.
      dateOfBirth: `19${80+i%18}-0${(i%9)+1}-15`
    };
    employees.push(employee);
    employments.push({
      employmentId: `E-${String(i+1).padStart(4,"0")}`,
      employeeId: id, organisationId, employmentStatus: employee.active ? "Active" : "Inactive",
      startDate: employee.startDate, endDate: employee.active ? null : "2026-06-30",
      contractType: i%4===0 ? "Fixed Term" : "Permanent",
      contractedHoursPerWeek: [16,20,30,37.5,40][i%5],
      locationId: location.id, locationName: location.name,
      jobTitle: role, divisionId: employee.divisionId
    });
  }
  const shifts = [];
  const base = new Date("2026-11-02T00:00:00Z");
  for (let day=0; day<21; day++) {
    const d = new Date(base); d.setUTCDate(base.getUTCDate()+day);
    const workDate = d.toISOString().slice(0,10);
    for (let j=0; j<12; j++) {
      const emp = employees[(day*7+j*3)%employees.length];
      const location = locations[(day+j)%locations.length];
      const startHour = [7,8,9,10,11,12,14,15,16][(day+j)%9];
      const duration = [4,6,7,8,8][(day*2+j)%5];
      const start = new Date(`${workDate}T${String(startHour).padStart(2,"0")}:00:00.000Z`);
      const end = new Date(start.getTime()+duration*3600000);
      const pad = n => String(n).padStart(2,"0");
      const fourthTime = date => `${date.toISOString().slice(0,19)}:0000`;
      shifts.push({
        locationTnAId: location.locationTnAId,
        fourthAccountId: "0058E000001hYirQAE",
        workDate,
        startDateTime: fourthTime(start),
        endDateTime: fourthTime(end),
        breakMinutes: duration >= 6 ? 30 : 0,
        roleName: emp.jobTitle,
        locationName: location.locationName,
        departmentName: divisions.find(x=>x.id===emp.divisionId)?.divisionName || "1. Front of House",
        // Additional linking fields for the simulator; verify availability in the real tenant API.
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        shiftId: `SH-${workDate.replaceAll("-","")}-${String(day*12+j+1).padStart(3,"0")}`,
        published: true,
        status: "Published"
      });
    }
  }
  const absences = [
    { absenceId:"ABS-001", organisationId, employeeId:employees[2].employeeId, absenceType:"Annual Leave", startDate:"2026-11-05", endDate:"2026-11-07", status:"Approved", hours:22.5 },
    { absenceId:"ABS-002", organisationId, employeeId:employees[8].employeeId, absenceType:"Sickness", startDate:"2026-11-09", endDate:"2026-11-10", status:"Recorded", hours:15 },
    { absenceId:"ABS-003", organisationId, employeeId:employees[15].employeeId, absenceType:"Annual Leave", startDate:"2026-11-12", endDate:"2026-11-13", status:"Pending", hours:15 }
  ];
  const payParts = shifts.slice(0,30).map((s,i)=>({
    payPartId:`PP-${i+1}`, organisationId, employeeId:s.employeeId, workDate:s.workDate,
    payCode: "BASIC", description:"Basic hours", quantity:7.5, unit:"hours", locationId:locations[i%3].id
  }));
  const timeAttendance = shifts.slice(0,24).map((s,i)=>({
    attendanceId:`TA-${i+1}`, employeeId:s.employeeId, date:s.workDate,
    clockIn:s.startDateTime, clockOut:s.endDateTime, status:i%7===0?"Adjusted":"Complete",
    locationTnAId:s.locationTnAId
  }));
  return {
    organisations:[{id:organisationId, name:"Acme Hospitality Group", country:"GB", currency:"GBP"}],
    employees, employments, shifts, absences, payParts, locations, divisions, timeAttendance
  };
}