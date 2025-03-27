import pg from 'pg';
const { Pool } = pg;
import { ExpenseRepository } from '../../domain/ports/expense-repository.js';

export class PostgresRepository extends ExpenseRepository {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.pool = new Pool({
      user: config.user,
      host: config.host,
      database: config.database,
      password: config.password,
      port: config.port,
    });
  }

  async saveExpense(expense) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO expenses (fecha, hora, valor_transaccion, lugar_transaccion, fecha_creacion, email_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      const values = [
        expense.date,
        expense.time,
        expense.amount,
        expense.location,
        expense.createdAt,
        expense.emailId,
      ];

      await client.query(query, values);
      await client.query('COMMIT');

      this.logger.info(
        `Gasto guardado en la base de datos: ${expense.location}`
      );
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      // if error constraint is "expenses_unique_id_email" not throw error
      if (error.constraint === 'expenses_unique_id_email') {
        this.logger.warn(
          `El gasto con email ID: ${expense.emailId} ya existe en la base de datos`
        );
      } else {
        this.logger.error(`Error guardando en base de datos: ${error.message}`);
        throw error;
      }
    } finally {
      client.release();
    }
  }

  // add method to get expense by email_id
  async getExpenseByEmailId(emailId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT
          fecha,
          hora,
          valor_transaccion,
          lugar_transaccion,
          fecha_creacion,
          email_id
        FROM expenses
        WHERE email_id = $1
      `;

      const values = [emailId];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Error obteniendo gasto por email ID: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
