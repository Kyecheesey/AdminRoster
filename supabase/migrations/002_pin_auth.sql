-- Switch from email magic-link to name + PIN login (validated in the edge function)
alter table staff alter column email drop not null;
alter table staff add column pin_hash text; -- format: salt$sha256hex(salt:pin)
