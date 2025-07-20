"""add_daily_sales_table

Revision ID: 3ef063111a38
Revises: a8c5aa35d116
Create Date: 2025-07-18 15:11:13.362527

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ef063111a38'
down_revision: Union[str, Sequence[str], None] = 'a8c5aa35d116'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('daily_sales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('sku_id', sa.String(), nullable=False),
        sa.Column('units_sold', sa.Integer(), nullable=False),
        sa.Column('inventory_list_id', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['inventory_list_id'], ['inventory_lists.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_daily_sales_id'), 'daily_sales', ['id'], unique=False)
    op.create_index(op.f('ix_daily_sales_sku_id'), 'daily_sales', ['sku_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_daily_sales_sku_id'), table_name='daily_sales')
    op.drop_index(op.f('ix_daily_sales_id'), table_name='daily_sales')
    op.drop_table('daily_sales')
