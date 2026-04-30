-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "honorific" TEXT NOT NULL DEFAULT '御中',
    "postal_code" TEXT,
    "prefecture" TEXT,
    "city" TEXT,
    "building" TEXT,
    "tel" TEXT,
    "contacts" JSONB,
    "default_payment_terms" TEXT,
    "fee_bearer" TEXT NOT NULL DEFAULT 'client',
    "send_method" TEXT NOT NULL DEFAULT 'post',
    "bank_account_id" TEXT,
    "client_number" TEXT,
    "corporate_number" TEXT,
    "invoice_eligibility" TEXT NOT NULL DEFAULT 'unset',
    "invoice_registration_number" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "project_number" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_status" TEXT NOT NULL DEFAULT 'estimating',
    "invoice_timing" TEXT NOT NULL DEFAULT 'single',
    "invoice_date" TEXT,
    "split_invoice_dates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recurring_interval" TEXT,
    "recurring_notify" BOOLEAN,
    "recurring_auto_renew" BOOLEAN,
    "delivery_date" TEXT,
    "sync_delivery_date" BOOLEAN,
    "payment_terms" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "progress" TEXT NOT NULL DEFAULT 'not_started',
    "rounding" TEXT NOT NULL DEFAULT 'floor',
    "internal_memo" TEXT,
    "estimate_amount" INTEGER NOT NULL DEFAULT 0,
    "invoice_amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "primary_date" TEXT,
    "secondary_date" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_items" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "row_type" TEXT NOT NULL DEFAULT 'normal',
    "name" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "tax_rate" INTEGER NOT NULL DEFAULT 10,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_branches" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "subject" TEXT,
    "primary_date" TEXT,
    "secondary_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_number_key" ON "projects"("project_number");

-- CreateIndex
CREATE UNIQUE INDEX "documents_project_id_type_key" ON "documents"("project_id", "type");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_branches" ADD CONSTRAINT "estimate_branches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
