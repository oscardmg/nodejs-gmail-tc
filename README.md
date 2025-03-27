docker compose up -d


docker compose logs -f app

docker compose logs -f db


docker compose down



CREATE TABLE public.expenses (
	id serial4 NOT NULL,
	fecha date NOT NULL,
	hora time NOT NULL,
	valor_transaccion numeric(15, 2) NOT NULL,
	lugar_transaccion varchar(255) NOT NULL,
	fecha_creacion timestamp DEFAULT now() NOT NULL,
	email_id varchar(20) NOT NULL,
	CONSTRAINT expenses_pkey PRIMARY KEY (id),
	CONSTRAINT expenses_unique_email_id UNIQUE (email_id)
);
