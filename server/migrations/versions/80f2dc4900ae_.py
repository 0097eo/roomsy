"""empty message

Revision ID: 80f2dc4900ae
Revises: 3e28c29ef101
Create Date: 2024-12-01 22:55:33.110604

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '80f2dc4900ae'
down_revision = '3e28c29ef101'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('username', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.Enum('ADMIN', 'CLIENT', 'OWNER', name='userrole'), nullable=False),
    sa.Column('verification_code', sa.String(length=255), nullable=True),
    sa.Column('auth0_sub', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('social_id', sa.String(length=255), nullable=True),
    sa.Column('social_provider', sa.String(length=50), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('auth0_sub'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('social_id'),
    sa.UniqueConstraint('username')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index('idx_user_role', ['role'], unique=False)

    op.create_table('spaces',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('owner_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('address', sa.String(length=255), nullable=False),
    sa.Column('capacity', sa.Integer(), nullable=False),
    sa.Column('hourly_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('daily_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.Enum('AVAILABLE', 'BOOKED', 'MAINTENANCE', name='spacestatus'), nullable=True),
    sa.Column('amenities', sa.JSON(), nullable=True),
    sa.Column('rules', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name=op.f('fk_spaces_owner_id_users')),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('spaces', schema=None) as batch_op:
        batch_op.create_index('idx_space_status', ['status'], unique=False)

    op.create_table('bookings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('space_id', sa.Integer(), nullable=False),
    sa.Column('start_time', sa.DateTime(), nullable=False),
    sa.Column('end_time', sa.DateTime(), nullable=False),
    sa.Column('total_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', name='bookingstatus'), nullable=True),
    sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_charge_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_payment_status', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['client_id'], ['users.id'], name=op.f('fk_bookings_client_id_users')),
    sa.ForeignKeyConstraint(['space_id'], ['spaces.id'], name=op.f('fk_bookings_space_id_spaces')),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.create_index('idx_booking_dates', ['start_time', 'end_time'], unique=False)

    op.create_table('space_images',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('space_id', sa.Integer(), nullable=False),
    sa.Column('image_url', sa.String(length=255), nullable=False),
    sa.Column('is_primary', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['space_id'], ['spaces.id'], name=op.f('fk_space_images_space_id_spaces')),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('booking_id', sa.Integer(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('payment_method', sa.String(length=50), nullable=False),
    sa.Column('transaction_id', sa.String(length=255), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], name=op.f('fk_payments_booking_id_bookings')),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('transaction_id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('payments')
    op.drop_table('space_images')
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.drop_index('idx_booking_dates')

    op.drop_table('bookings')
    with op.batch_alter_table('spaces', schema=None) as batch_op:
        batch_op.drop_index('idx_space_status')

    op.drop_table('spaces')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('idx_user_role')

    op.drop_table('users')
    # ### end Alembic commands ###
