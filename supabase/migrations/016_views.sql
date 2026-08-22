create or replace view finance_summary as

select

    transaction_type,

    category,

    count(*) as transaction_count,

    sum(amount) as total_amount

from finance_transactions

group by

    transaction_type,

    category;

create or replace view monthly_finance as

select

    date_trunc('month', transaction_date) as month,

    transaction_type,

    sum(amount) as total_amount

from finance_transactions

group by

    month,

    transaction_type

order by

    month;