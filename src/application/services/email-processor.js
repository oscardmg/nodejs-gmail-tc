import { Expense } from '../../domain/models/expense.js';

export class EmailProcessor {
  constructor(emailAdapter, expenseRepository, logger) {
    this.emailAdapter = emailAdapter;
    this.expenseRepository = expenseRepository;
    this.logger = logger;
  }
  
  async processEmails() {
    try {
      // Obtener emails nuevos con asunto "DAVIVIENDA"
      this.logger.info('Buscando correos con asunto DAVIVIENDA');
      const emails = await this.emailAdapter.fetchNewEmails();
      this.logger.info(`Se encontraron ${emails.length} correos para procesar`);
      
      // Procesar cada email
      for (const email of emails) {
        try {
          // Extraer información
          const expenseData = this._extractExpenseData(email.content);
          
          if (!expenseData) {
            this.logger.warn(`No se pudo extraer información del correo ID: ${email.id}`);
            continue;
          }
          
          // Crear entidad de dominio
          const expense = new Expense(
            expenseData.date,
            expenseData.time,
            expenseData.amount,
            expenseData.location,
            email.id
          );
          
          // Validar datos
          expense.validate();
          
          // Guardar en base de datos
          await this.expenseRepository.saveExpense(expense);
          this.logger.info(`Gasto procesado exitosamente: ${expense.location} - ${expense.amount}`);
        } catch (error) {
          this.logger.error(`Error procesando email: ${error.message}`);
          // Continuar con el siguiente correo en caso de error
          continue;
        }
      }
      
      return { success: true, processedCount: emails.length };
    } catch (error) {
      this.logger.error(`Error en el procesamiento de correos: ${error.message}`);
      throw error;
    }
  }
  
  _extractExpenseData(emailContent) {
    try {
      // Expresiones regulares para extraer la información requerida
      const dateRegex = /Fecha:\s*(\d{4}\/\d{2}\/\d{2})/;
      const timeRegex = /Hora:\s*(\d{1,2}:\d{2}:\d{2})/;
      const amountRegex = /Valor Transacción:\s*([\d,]+)/;
      const locationRegex = /Lugar de Transacción:\s*([^\n]+)/;
      
      // Extraer valores mediante regex
      const dateMatch = emailContent.match(dateRegex);
      const timeMatch = emailContent.match(timeRegex);
      const amountMatch = emailContent.match(amountRegex);
      const locationMatch = emailContent.match(locationRegex);
      
      // Verificar que se encontraron todos los datos
      if (!dateMatch || !timeMatch || !amountMatch || !locationMatch) {
        this.logger.warn('No se pudieron extraer todos los campos requeridos del correo');
        return null;
      }
      
      // Formatear el valor numérico (eliminar comas)
      const rawAmount = amountMatch[1];
      const amount = parseFloat(rawAmount.replace(/,/g, ''));
      
      return {
        date: dateMatch[1],
        time: timeMatch[1],
        amount: amount,
        location: locationMatch[1].trim()
      };
    } catch (error) {
      this.logger.error(`Error extrayendo datos del correo: ${error.message}`);
      return null;
    }
  }
}

