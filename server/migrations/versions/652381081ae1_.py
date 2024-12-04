"""empty message

Revision ID: 652381081ae1
Revises: 80f2dc4900ae
Create Date: 2024-12-04 09:42:50.748591

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '652381081ae1'
down_revision = '80f2dc4900ae'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('space_images')
    with op.batch_alter_table('spaces', schema=None) as batch_op:
        batch_op.add_column(sa.Column('images', sa.JSON(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('spaces', schema=None) as batch_op:
        batch_op.drop_column('images')

    op.create_table('space_images',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('space_id', sa.INTEGER(), nullable=False),
    sa.Column('image_url', sa.VARCHAR(length=255), nullable=False),
    sa.Column('is_primary', sa.BOOLEAN(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=True),
    sa.ForeignKeyConstraint(['space_id'], ['spaces.id'], name='fk_space_images_space_id_spaces'),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###