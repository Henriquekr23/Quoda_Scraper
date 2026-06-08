CREATE TABLE `clausulas` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`instrumento_id` bigint,
	`titulo` text,
	`conteudo` text,
	`categoria` varchar(100),
	`criado_em` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `clausulas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `instrumentos` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sindicato_id` bigint,
	`numero_registro` varchar(50),
	`numero_solicitacao` varchar(50),
	`tipo_instrumento` varchar(100),
	`uf` varchar(2),
	`data_protocolo` date,
	`data_registro` date,
	`vigencia_inicio` date,
	`vigencia_fim` date,
	`situacao` varchar(50),
	`html_path` text,
	`pdf_path` text,
	`hash_documento` varchar(255),
	`criado_em` timestamp DEFAULT CURRENT_TIMESTAMP,
	`atualizado_em` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instrumentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sindicatos` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`cnpj` varchar(20) NOT NULL,
	`nome` varchar(255),
	`ativo` boolean DEFAULT true,
	`criado_em` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sindicatos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clausulas` ADD CONSTRAINT `clausulas_instrumento_id_instrumentos_id_fk` FOREIGN KEY (`instrumento_id`) REFERENCES `instrumentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instrumentos` ADD CONSTRAINT `instrumentos_sindicato_id_sindicatos_id_fk` FOREIGN KEY (`sindicato_id`) REFERENCES `sindicatos`(`id`) ON DELETE no action ON UPDATE no action;