"""Add inventory_list_id to inventory

Revision ID: a8c5aa35d116
Revises: 
Create Date: 2025-07-17 14:21:27.924925

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8c5aa35d116'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

def upgrade():
    op.add_column('inventory', sa.Column('inventory_list_id', sa.String(), nullable=True))
    op.create_foreign_key('fk_inventory_list', 'inventory', 'inventory_lists', ['inventory_list_id'], ['id'], ondelete='CASCADE')

def downgrade():
    op.drop_constraint('fk_inventory_list', 'inventory', type_='foreignkey')
    op.drop_column('inventory', 'inventory_list_id')