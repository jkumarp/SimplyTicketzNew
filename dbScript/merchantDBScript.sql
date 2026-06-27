-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE merchant.merchant_subscription_invoice (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  invoice_number character varying NOT NULL,
  merchant_id bigint NOT NULL,
  merchant_service_id bigint NOT NULL,
  merchant_subscription_id bigint NOT NULL,
  total_amount numeric NOT NULL,
  sgst numeric,
  cgst numeric,
  igst numeric,
  discount numeric,
  grand_total numeric NOT NULL,
  update_by bigint NOT NULL,
  update_date timestamp without time zone NOT NULL,
  status_sw boolean,
  CONSTRAINT merchant_subscription_invoice_pkey PRIMARY KEY (id),
  CONSTRAINT merchant_subscription_invoice_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES master.merchant(id),
  CONSTRAINT merchant_subscription_invoice_merchant_service_id_fkey FOREIGN KEY (merchant_service_id) REFERENCES master.merchant_service(id),
  CONSTRAINT merchant_subscription_invoice_merchant_subscription_id_fkey FOREIGN KEY (merchant_subscription_id) REFERENCES master.merchant_subscription(id)
);
CREATE TABLE merchant.merchant_payment (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  merchant_id bigint NOT NULL,
  merchant_subscription_invoice_id bigint NOT NULL,
  merchant_service_id bigint NOT NULL,
  merchant_subscription_id bigint NOT NULL,
  payment_mode character varying,
  aggregator_reference_number character varying,
  bank_reference_number character varying,
  status character varying NOT NULL,
  remark character varying,
  update_by bigint NOT NULL,
  update_date timestamp without time zone NOT NULL,
  CONSTRAINT merchant_payment_pkey PRIMARY KEY (id),
  CONSTRAINT merchant_payment_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES master.merchant(id),
  CONSTRAINT merchant_payment_merchant_subscription_invoice_id_fkey FOREIGN KEY (merchant_subscription_invoice_id) REFERENCES merchant.merchant_subscription_invoice(id),
  CONSTRAINT merchant_payment_merchant_service_id_fkey FOREIGN KEY (merchant_service_id) REFERENCES master.merchant_service(id),
  CONSTRAINT merchant_payment_merchant_subscription_id_fkey FOREIGN KEY (merchant_subscription_id) REFERENCES master.merchant_subscription(id)
);
CREATE TABLE merchant.user_activity_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  merchant_id bigint,
  user_id bigint,
  email character varying,
  phone_country_code character varying,
  phone character varying,
  jwt_token character varying,
  otp character varying,
  logintime timestamp without time zone NOT NULL,
  attempt_count integer,
  update_by bigint NOT NULL,
  update_date timestamp without time zone NOT NULL,
  CONSTRAINT user_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_log_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES master.merchant(id),
  CONSTRAINT user_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES master.user(id)
);