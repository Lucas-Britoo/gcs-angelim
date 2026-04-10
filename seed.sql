-- Para rodar esse código:
-- 1. Abra o painel do seu projeto no Supabase.
-- 2. No menu lateral esquerdo, clique em "SQL Editor".
-- 3. Clique em "New Query".
-- 4. Copie todo o código abaixo, cole lá e clique em "RUN" (botão verde).

CREATE TABLE IF NOT EXISTS public.gcs (
    id bigint primary key,
    nome text,
    dia text,
    horario text,
    bairro text,
    endereco text,
    lider text,
    contato text,
    obs text,
    lat text,
    lng text
);

-- Limpa a tabela caso ela tenha sujeira
TRUNCATE TABLE public.gcs;

-- Injeta os dados originais
INSERT INTO public.gcs (id, nome, dia, horario, bairro, endereco, lider, contato, obs, lat, lng) VALUES
(1, 'GC Sao Francisco', 'Sexta', '19:30', 'São Francisco', 'Rua Joaquim Santos, 621', 'Álefe e Camila', '(86) 99918-6632', NULL, '-2.9105', '-41.7650'),
(2, 'GC Centro', 'Quinta Feira', '19:30', 'Centro', 'Rua Pedro II, 1444', 'Paula Vaz', '(86) 99954-7775', NULL, '-2.9042', '-41.7761'),
(3, 'GC Dirceu', 'Terça', '19:30', 'Dirceu', 'Rua Raimundo Rodrigues dos Santos, 165', 'Italo & Aryane Félix', '(86) 99436-8350', NULL, '-2.9230', '-41.7510'),
(4, 'GC Floriópolis II', 'Terça-feira', '20:00', 'Floriópolis', 'Loteamento conviver IV, Quadra 7, Casa 2', 'Larissa Melo', '(86) 98174-2025', NULL, '-2.897694', '-41.718778'),
(5, 'GC Frei Higino I', 'Quinta', '19:30', 'Frei Higino', 'Rua Samuel Santos, 7630', 'Hércules e Mariana', '(98) 98748-2797', NULL, '-2.9120', '-41.7600'),
(6, 'GC Afya Parnaíba II', 'Terça Feira', '16:30', 'Sabiazal', 'FACULDADE AFYA PARNAÍBA', 'LUCAS GALVÃO', '(98) 99215-1410', 'Área Verde', '-2.9400', '-41.7800'),
(7, 'GC Joaz Sousa', 'Terça-Feira', '19:30', 'Joaz Sousa', 'Quadra 05, Casa 31', 'Daniel e Dayane', '(86) 99999-2991', NULL, '-2.8800', '-41.7500'),
(8, 'GC NASSAU', 'Quinta', '18h', 'Floriópolis', 'FACULDADE UNINASSAU', 'Maria Rita e Amanda Mayana', '(86) 99565-5565', NULL, '-2.9290', '-41.7410'),
(9, 'GC Parnaíba Residence', 'Quinta', '19:30', 'João XXIII', 'Conviver Parnaíba Residence, Q 10, C 26', 'Silver e Luana', '(86) 99930-3756', NULL, '-2.9150', '-41.7300'),
(10, 'GC FLORIOPOLIS I', 'Terça-feira', '17h', 'Floriópolis', 'Rua loteamento Conviver lV, Q 17, Casa 07', 'Brenda Bueno', '(86) 99419-0258', NULL, '-2.9310', '-41.7420'),
(11, 'GC São Benedito I', 'Terça-feira', '19:30', 'São Benedito', 'Rua Pedro Braga, 251', 'Brenno e Rafaela', '(86) 99435-5415', NULL, '-2.9050', '-41.7650'),
(12, 'GC São Benedito II', 'Quinta-feira', '19:30', 'São Benedito', 'Av. Marc Jacob, 425', 'Júnior e Andreia', '(86) 99978-4625', NULL, '-2.9060', '-41.7640'),
(13, 'GC São Benedito III', 'Quinta-feira', '19:30', 'São Benedito', 'Rua Telius Ferraz, 220', 'Francisco Htangelo e Ana Cristina', '(86) 99550-7695', NULL, '-2.9070', '-41.7630'),
(14, 'GC Frei Higino II', 'Quinta-feira', '19:30', 'Frei Higino', 'Av. Desembargador Walter Carvalho, 616', 'Israel e Talita', '(86) 99470-3404', NULL, '-2.9130', '-41.7610'),
(15, 'GC Kids', 'Quinta-feira', '19:30', 'São Benedito', 'Av. Marc Jacob, 425', 'Francisca', '(86) 98153-2375', 'Crianças de 7 a 11 anos', '-2.9065', '-41.7645'),
(16, 'GC Jardim Atlântico', 'Terça-feira', '19:30', 'Floriópolis', 'Jardim Atlântico II, Av Professor José Nelson Q18 C 2', 'George e Ana Clara', '(86) 98864-2678', NULL, '-2.9320', '-41.7430'),
(17, 'GC Online', 'Sábado', '15h', 'Online', 'Via meet', 'João Filho e Débora', '(86) 99528-2007', NULL, NULL, NULL),
(18, 'GC Planalto', 'Terça-feira', '19h30', 'Planalto', 'Rua Ranupho Torres Rapouso, 1440', 'Weiner e Rute', '(86) 99803-1495', NULL, '-2.9200', '-41.7500'),
(19, 'GC Bebedouro', 'Sábado', '16h', 'Bebedouro', 'Rua Oeiras, 1006', 'Wesley Silva', '(31) 98982-3967', NULL, '-2.9500', '-41.7800'),
(20, 'GC Pindorama', 'Quinta', '19:00', 'Pindorama', 'Rua Afonso Pena, 2003, Ap 5', 'Jordeson Rodrigues', '(89) 99456-2487', NULL, '-2.9000', '-41.7600'),
(21, 'GC UFDPar', 'Sexta-feira', '13h', 'Nossa Sra. de Fátima', 'Av. São Sebastião, 2819', 'Sayure', '(86) 98107-1532', 'Área de Lazer', '-2.9050', '-41.7700'),
(22, 'GC Colina', 'Terça-feira', '19h30', 'João XXIII', 'Conj Colina da Alvorada 1 Quadra 15, Casa 09', 'Douglas Souza & Joelya Karla', '(86) 99990-5846', NULL, '-2.9160', '-41.7310'),
(23, 'GC Floriópolis III', 'Terça-feira', '20h', 'Floriópolis', 'Loteamento Conviver IV, Q17, C 06', 'Bruna Mendonça', '(86) 98120-2046', NULL, '-2.9330', '-41.7440'),
(24, 'GC Afya Parnaíba I', 'Terça', '16h', 'Sabiazal', 'Faculdade Afya Parnaíba', 'Ana Tavares', '(86) 99477-5852', 'Área Verde', '-2.9410', '-41.7790'),
(25, 'GC Reis Veloso', 'Sexta', '14:30', 'Reis Veloso', 'Rua Abigail Nogueira Batista 205', 'Ana Tavares', '(86) 99477-5852', NULL, '-2.9010', '-41.7500'),
(26, 'Igreja Angelim Parnaíba (Sede)', 'Qua, Sáb e Dom', '19h30, 18h e 10h/18h', 'Reis Veloso', 'Av. Dep. Pinheiro Machado, 115', 'Pr. Leandro Arrais e Pra. Larisse Arrais', '-', NULL, '-2.904959551930751', '-41.75327635838159');
