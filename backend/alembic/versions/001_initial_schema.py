"""Initial schema migration for AQI AI platform

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-13 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Cities table
    op.create_table(
        'cities',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True, server_default='India'),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cities_name'), 'cities', ['name'], unique=True)

    # 2. Historical AQI table
    op.create_table(
        'historical_aqi',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('city_id', sa.String(length=36), nullable=False),
        sa.Column('observation_date', sa.String(length=10), nullable=False),
        sa.Column('aqi', sa.Float(), nullable=False),
        sa.Column('original_category', sa.String(length=50), nullable=True),
        sa.Column('data_source', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('city_id', 'observation_date', name='uq_city_date')
    )
    op.create_index(op.f('ix_historical_aqi_city_id'), 'historical_aqi', ['city_id'], unique=False)
    op.create_index(op.f('ix_historical_aqi_observation_date'), 'historical_aqi', ['observation_date'], unique=False)
    op.create_index(op.f('ix_historical_aqi_aqi'), 'historical_aqi', ['aqi'], unique=False)

    # 3. Pollutant records table
    op.create_table(
        'pollutant_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('historical_aqi_id', sa.String(length=36), nullable=False),
        sa.Column('pm25', sa.Float(), nullable=True),
        sa.Column('pm10', sa.Float(), nullable=True),
        sa.Column('no', sa.Float(), nullable=True),
        sa.Column('no2', sa.Float(), nullable=True),
        sa.Column('nox', sa.Float(), nullable=True),
        sa.Column('nh3', sa.Float(), nullable=True),
        sa.Column('co', sa.Float(), nullable=True),
        sa.Column('so2', sa.Float(), nullable=True),
        sa.Column('o3', sa.Float(), nullable=True),
        sa.Column('benzene', sa.Float(), nullable=True),
        sa.Column('toluene', sa.Float(), nullable=True),
        sa.Column('xylene', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['historical_aqi_id'], ['historical_aqi.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('historical_aqi_id', name='uq_pollutant_historical_aqi')
    )

    # 4. Weather records table
    op.create_table(
        'weather_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('city_id', sa.String(length=36), nullable=False),
        sa.Column('observation_date', sa.String(length=10), nullable=False),
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('relative_humidity', sa.Float(), nullable=True),
        sa.Column('wind_speed', sa.Float(), nullable=True),
        sa.Column('wind_direction', sa.Float(), nullable=True),
        sa.Column('precipitation', sa.Float(), nullable=True),
        sa.Column('surface_pressure', sa.Float(), nullable=True),
        sa.Column('data_source', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('city_id', 'observation_date', name='uq_weather_city_date')
    )
    op.create_index(op.f('ix_weather_records_city_id'), 'weather_records', ['city_id'], unique=False)
    op.create_index(op.f('ix_weather_records_observation_date'), 'weather_records', ['observation_date'], unique=False)

    # 5. Prediction records table
    op.create_table(
        'prediction_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('city_id', sa.String(length=36), nullable=False),
        sa.Column('reference_aqi', sa.Float(), nullable=True),
        sa.Column('predicted_aqi', sa.Float(), nullable=False),
        sa.Column('prediction_horizon', sa.String(length=50), nullable=False),
        sa.Column('prediction_type', sa.String(length=50), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('is_demo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_prediction_records_city_id'), 'prediction_records', ['city_id'], unique=False)

    # 6. Model registry table
    op.create_table(
        'model_registry',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('task_type', sa.String(length=50), nullable=False),
        sa.Column('algorithm', sa.String(length=100), nullable=False),
        sa.Column('framework', sa.String(length=100), nullable=False),
        sa.Column('artifact_path', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_model_registry_name'), 'model_registry', ['name'], unique=True)

    # 7. Model evaluations table
    op.create_table(
        'model_evaluations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('model_id', sa.String(length=36), nullable=False),
        sa.Column('mae', sa.Float(), nullable=True),
        sa.Column('rmse', sa.Float(), nullable=True),
        sa.Column('r2', sa.Float(), nullable=True),
        sa.Column('accuracy', sa.Float(), nullable=True),
        sa.Column('precision', sa.Float(), nullable=True),
        sa.Column('recall', sa.Float(), nullable=True),
        sa.Column('f1', sa.Float(), nullable=True),
        sa.Column('evaluation_period', sa.String(length=100), nullable=True),
        sa.Column('is_demo_estimate', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['model_id'], ['model_registry.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. Data import jobs table
    op.create_table(
        'data_import_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('source_filename', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('rows_read', sa.Integer(), nullable=True),
        sa.Column('rows_inserted', sa.Integer(), nullable=True),
        sa.Column('rows_updated', sa.Integer(), nullable=True),
        sa.Column('rows_rejected', sa.Integer(), nullable=True),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('data_import_jobs')
    op.drop_table('model_evaluations')
    op.drop_table('model_registry')
    op.drop_table('prediction_records')
    op.drop_table('weather_records')
    op.drop_table('pollutant_records')
    op.drop_table('historical_aqi')
    op.drop_table('cities')
