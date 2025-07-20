"""remove_unique_constraint_on_sku_id

Revision ID: 868260497727
Revises: 3ef063111a38
Create Date: 2025-07-18 15:30:43.022802

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '868260497727'
down_revision: Union[str, Sequence[str], None] = '3ef063111a38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if the unique constraint exists and drop it if it does
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    constraints = inspector.get_unique_constraints('inventory')
    
    # Find and drop any unique constraint on sku_id
    for constraint in constraints:
        if 'sku_id' in constraint['column_names'] and len(constraint['column_names']) == 1:
            op.drop_constraint(constraint['name'], 'inventory', type_='unique')
            break
    
    # Create a composite unique constraint on (sku_id, inventory_list_id)
    op.create_unique_constraint('uq_inventory_sku_list', 'inventory', ['sku_id', 'inventory_list_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the composite unique constraint
    op.drop_constraint('uq_inventory_sku_list', 'inventory', type_='unique')
    
    # Recreate the original unique constraint on sku_id
    op.create_unique_constraint('ix_inventory_sku_id', 'inventory', ['sku_id'])
