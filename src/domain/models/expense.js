export class Expense {
  constructor(date, time, amount, location, emailId) {
    this.date = date;
    this.time = time;
    this.amount = amount;
    this.location = location;
    this.createdAt = new Date();
    this.emailId = emailId;
  }
  
  validate() {
    if (!this.date || !this.time || !this.amount || !this.location || !this.emailId) {
      throw new Error('Todos los campos son obligatorios');
    }
    
    // Validaciones adicionales pueden ser agregadas aquí
    return true;
  }
}
