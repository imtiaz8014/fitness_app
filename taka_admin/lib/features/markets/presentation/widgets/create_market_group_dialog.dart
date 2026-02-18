import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_constants.dart';
import '../bloc/market_bloc.dart';

class _OutcomeEntry {
  final TextEditingController titleController;
  DateTime? deadline;

  _OutcomeEntry()
      : titleController = TextEditingController();

  void dispose() {
    titleController.dispose();
  }
}

class CreateMarketGroupDialog extends StatefulWidget {
  const CreateMarketGroupDialog({super.key});

  @override
  State<CreateMarketGroupDialog> createState() =>
      _CreateMarketGroupDialogState();
}

class _CreateMarketGroupDialogState extends State<CreateMarketGroupDialog> {
  final _groupTitleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _category = AppConstants.marketCategories.first;
  final _formKey = GlobalKey<FormState>();
  final List<_OutcomeEntry> _outcomes = [_OutcomeEntry(), _OutcomeEntry()];

  @override
  void dispose() {
    _groupTitleController.dispose();
    _descriptionController.dispose();
    for (final o in _outcomes) {
      o.dispose();
    }
    super.dispose();
  }

  void _addOutcome() {
    setState(() => _outcomes.add(_OutcomeEntry()));
  }

  void _removeOutcome(int index) {
    if (_outcomes.length <= 2) return;
    setState(() {
      _outcomes[index].dispose();
      _outcomes.removeAt(index);
    });
  }

  Future<void> _pickDeadline(int index) async {
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
      _outcomes[index].deadline =
          DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    for (int i = 0; i < _outcomes.length; i++) {
      if (_outcomes[i].deadline == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Please select a deadline for outcome ${i + 1}'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    final markets = _outcomes
        .map((o) => <String, String>{
              'title': o.titleController.text.trim(),
              'deadline': o.deadline!.toIso8601String(),
            })
        .toList();

    context.read<MarketBloc>().add(CreateMarketGroup(
          groupTitle: _groupTitleController.text.trim(),
          description: _descriptionController.text.trim(),
          category: _category,
          markets: markets,
        ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Create Market Group'),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _groupTitleController,
                  decoration:
                      const InputDecoration(labelText: 'Group Title'),
                  validator: (v) =>
                      v != null && v.trim().isNotEmpty ? null : 'Required',
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descriptionController,
                  decoration:
                      const InputDecoration(labelText: 'Description'),
                  maxLines: 3,
                  validator: (v) =>
                      v != null && v.trim().isNotEmpty ? null : 'Required',
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _category,
                  decoration:
                      const InputDecoration(labelText: 'Category'),
                  items: AppConstants.marketCategories
                      .map(
                          (c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _category = v);
                  },
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Outcomes (${_outcomes.length})',
                        style: Theme.of(context).textTheme.titleSmall),
                    TextButton.icon(
                      onPressed: _addOutcome,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Add'),
                    ),
                  ],
                ),
                const Divider(),
                ..._outcomes.asMap().entries.map((entry) {
                  final i = entry.key;
                  final o = entry.value;
                  final deadlineStr = o.deadline != null
                      ? DateFormat('MMM d, yyyy h:mm a')
                          .format(o.deadline!)
                      : 'Select deadline';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text('Outcome ${i + 1}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13)),
                                const Spacer(),
                                if (_outcomes.length > 2)
                                  IconButton(
                                    icon: const Icon(Icons.close,
                                        size: 18),
                                    onPressed: () => _removeOutcome(i),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: o.titleController,
                              decoration: const InputDecoration(
                                labelText: 'Outcome Title',
                                isDense: true,
                              ),
                              validator: (v) => v != null &&
                                      v.trim().isNotEmpty
                                  ? null
                                  : 'Required',
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => _pickDeadline(i),
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Deadline',
                                  suffixIcon:
                                      Icon(Icons.calendar_today),
                                  isDense: true,
                                ),
                                child: Text(deadlineStr,
                                    style: const TextStyle(
                                        fontSize: 14)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
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
          child: const Text('Create Group'),
        ),
      ],
    );
  }
}
