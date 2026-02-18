import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_constants.dart';
import '../bloc/market_bloc.dart';

class CreateMarketDialog extends StatefulWidget {
  const CreateMarketDialog({super.key});

  @override
  State<CreateMarketDialog> createState() => _CreateMarketDialogState();
}

class _CreateMarketDialogState extends State<CreateMarketDialog> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _category = AppConstants.marketCategories.first;
  DateTime? _deadline;
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (time == null || !mounted) return;

    setState(() {
      _deadline = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_deadline == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please select a deadline'),
            backgroundColor: Colors.red),
      );
      return;
    }

    context.read<MarketBloc>().add(CreateMarket(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          category: _category,
          deadline: _deadline!.toIso8601String(),
        ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final deadlineStr = _deadline != null
        ? DateFormat('MMM d, yyyy h:mm a').format(_deadline!)
        : 'Select deadline';

    return AlertDialog(
      title: const Text('Create Market'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Title'),
                validator: (v) =>
                    v != null && v.trim().isNotEmpty ? null : 'Required',
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 3,
                validator: (v) =>
                    v != null && v.trim().isNotEmpty ? null : 'Required',
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: AppConstants.marketCategories
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _category = v);
                },
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickDeadline,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Deadline',
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  child: Text(deadlineStr),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: const Text('Create'),
        ),
      ],
    );
  }
}
